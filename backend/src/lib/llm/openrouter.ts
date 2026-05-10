import type {
    LlmMessage,
    NormalizedToolCall,
    OpenAIToolSchema,
    StreamChatParams,
    StreamChatResult,
} from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOKENS = 16384;

type OpenRouterMessage =
    | { role: "system" | "user"; content: string }
    | {
          role: "assistant";
          content: string | null;
          tool_calls?: OpenRouterToolCall[];
      }
    | {
          role: "tool";
          content: string;
          tool_call_id: string;
          name?: string;
      };

type OpenRouterToolCall = {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
};

type StreamToolCallDelta = {
    index?: number;
    id?: string;
    type?: "function";
    function?: {
        name?: string;
        arguments?: string;
    };
};

type StreamChoice = {
    finish_reason?: string | null;
    delta?: {
        content?: string | null;
        reasoning?: string | null;
        reasoning_content?: string | null;
        tool_calls?: StreamToolCallDelta[];
    };
    error?: { message?: string };
};

type StreamChunk = {
    choices?: StreamChoice[];
    error?: { message?: string };
};

type PendingToolCall = {
    id?: string;
    name?: string;
    arguments: string;
};

function apiKey(): string {
    const key = process.env.OPENROUTER_API_KEY?.trim();
    if (!key) {
        throw new Error(
            "OpenRouter is not configured. Set OPENROUTER_API_KEY on the backend.",
        );
    }
    return key;
}

function headers(): Record<string, string> {
    return {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "Avlys Legal AI",
    };
}

function toOpenRouterMessages(
    systemPrompt: string | undefined,
    messages: LlmMessage[],
): OpenRouterMessage[] {
    return [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
    ];
}

async function postChat(body: Record<string, unknown>): Promise<Response> {
    const resp = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        throw new Error(
            `OpenRouter request failed (${resp.status}): ${await errorText(resp)}`,
        );
    }

    return resp;
}

async function errorText(resp: Response): Promise<string> {
    const text = await resp.text();
    try {
        const body = JSON.parse(text) as { error?: { message?: string } };
        return body.error?.message ?? text;
    } catch {
        return text;
    }
}

function requestBody(params: {
    model: string;
    messages: OpenRouterMessage[];
    tools?: OpenAIToolSchema[];
    maxTokens?: number;
    stream: boolean;
}): Record<string, unknown> {
    const tools = params.tools ?? [];
    return {
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens ?? MAX_TOKENS,
        stream: params.stream,
        ...(tools.length ? { tools, tool_choice: "auto" } : {}),
    };
}

function appendToolDelta(
    pending: Map<number, PendingToolCall>,
    delta: StreamToolCallDelta,
): void {
    const index = delta.index ?? pending.size;
    const existing = pending.get(index) ?? { arguments: "" };

    if (delta.id) existing.id = delta.id;
    if (delta.function?.name) existing.name = delta.function.name;
    if (delta.function?.arguments) existing.arguments += delta.function.arguments;

    pending.set(index, existing);
}

function normalizeToolCalls(
    pending: Map<number, PendingToolCall>,
): { native: OpenRouterToolCall[]; normalized: NormalizedToolCall[] } {
    const native: OpenRouterToolCall[] = [];
    const normalized: NormalizedToolCall[] = [];

    for (const [index, call] of [...pending.entries()].sort((a, b) => a[0] - b[0])) {
        if (!call.name) continue;
        const id = call.id ?? `tool-${index}`;
        const args = call.arguments || "{}";
        native.push({
            id,
            type: "function",
            function: { name: call.name, arguments: args },
        });
        normalized.push({
            id,
            name: call.name,
            input: parseToolArguments(args, call.name),
        });
    }

    return { native, normalized };
}

function parseToolArguments(
    raw: string,
    toolName: string,
): Record<string, unknown> {
    if (!raw.trim()) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch (err) {
        throw new Error(
            `OpenRouter returned invalid JSON arguments for tool "${toolName}": ${
                err instanceof Error ? err.message : String(err)
            }`,
        );
    }
    return {};
}

async function readSseStream(
    resp: Response,
    onData: (data: string) => void,
): Promise<void> {
    if (!resp.body) throw new Error("OpenRouter response did not include a stream.");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
            handleSseFrame(frame, onData);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) handleSseFrame(buffer, onData);
}

function handleSseFrame(frame: string, onData: (data: string) => void): void {
    const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();

    if (!data || data === "[DONE]") return;
    onData(data);
}

export async function streamOpenRouter(
    params: StreamChatParams,
): Promise<StreamChatResult> {
    const {
        model,
        systemPrompt,
        tools = [],
        callbacks = {},
        runTools,
        enableThinking,
    } = params;
    const maxIter = params.maxIterations ?? 10;
    const messages = toOpenRouterMessages(systemPrompt, params.messages);
    let fullText = "";

    for (let iter = 0; iter < maxIter; iter++) {
        const resp = await postChat(
            requestBody({
                model,
                messages,
                tools,
                stream: true,
            }),
        );

        let text = "";
        let sawReasoning = false;
        let finishReason: string | null = null;
        const pendingToolCalls = new Map<number, PendingToolCall>();

        await readSseStream(resp, (data) => {
            const chunk = JSON.parse(data) as StreamChunk;
            if (chunk.error?.message) throw new Error(chunk.error.message);

            for (const choice of chunk.choices ?? []) {
                if (choice.error?.message) throw new Error(choice.error.message);
                if (choice.finish_reason) finishReason = choice.finish_reason;

                const reasoning =
                    choice.delta?.reasoning ?? choice.delta?.reasoning_content;
                if (enableThinking && reasoning) {
                    sawReasoning = true;
                    callbacks.onReasoningDelta?.(reasoning);
                }

                const content = choice.delta?.content;
                if (content) {
                    text += content;
                    callbacks.onContentDelta?.(content);
                }

                for (const tc of choice.delta?.tool_calls ?? []) {
                    appendToolDelta(pendingToolCalls, tc);
                }
            }
        });

        if (sawReasoning) callbacks.onReasoningBlockEnd?.();

        fullText += text;
        const toolCalls = normalizeToolCalls(pendingToolCalls);

        if (
            finishReason !== "tool_calls" ||
            !toolCalls.normalized.length ||
            !runTools
        ) {
            break;
        }

        for (const call of toolCalls.normalized) {
            callbacks.onToolCallStart?.(call);
        }

        const results = await runTools(toolCalls.normalized);
        messages.push({
            role: "assistant",
            content: text || null,
            tool_calls: toolCalls.native,
        });
        for (const result of results) {
            const match = toolCalls.normalized.find(
                (call) => call.id === result.tool_use_id,
            );
            messages.push({
                role: "tool",
                tool_call_id: result.tool_use_id,
                name: match?.name,
                content: result.content,
            });
        }
    }

    return { fullText };
}

export async function completeOpenRouterText(params: {
    model: string;
    systemPrompt?: string;
    user: string;
    maxTokens?: number;
}): Promise<string> {
    const resp = await postChat(
        requestBody({
            model: params.model,
            messages: toOpenRouterMessages(params.systemPrompt, [
                { role: "user", content: params.user },
            ]),
            maxTokens: params.maxTokens,
            stream: false,
        }),
    );
    const body = (await resp.json()) as {
        choices?: { message?: { content?: string | null }; text?: string }[];
        error?: { message?: string };
    };

    if (body.error?.message) throw new Error(body.error.message);
    return body.choices?.[0]?.message?.content ?? body.choices?.[0]?.text ?? "";
}
