import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat";
import { projectsRouter } from "./routes/projects";
import { projectChatRouter } from "./routes/projectChat";
import { documentsRouter } from "./routes/documents";
import { tabularRouter } from "./routes/tabular";
import { workflowsRouter } from "./routes/workflows";
import { userRouter } from "./routes/user";
import { downloadsRouter } from "./routes/downloads";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Simple request logger so Railway logs show all inbound requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} origin=${req.headers.origin ?? "none"}`);
  next();
});

// Allow the canonical frontend URL, any Vercel preview URL for this project,
// and localhost for dev. Preview URLs change on every deploy so a static
// allowlist would block them.
const allowedVercelOriginRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
const canonicalOrigins = [
  process.env.FRONTEND_URL,
  "https://mike-legal-ai-frontend.vercel.app",
  "https://avlys-legal-ai-frontend.vercel.app",
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / non-browser requests (no Origin header).
      if (!origin) return callback(null, true);
      if (canonicalOrigins.includes(origin)) return callback(null, true);
      if (allowedVercelOriginRegex.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));

app.use("/chat", chatRouter);
app.use("/projects", projectsRouter);
app.use("/projects/:projectId/chat", projectChatRouter);
app.use("/single-documents", documentsRouter);
app.use("/tabular-review", tabularRouter);
app.use("/workflows", workflowsRouter);
app.use("/user", userRouter);
app.use("/users", userRouter);
app.use("/download", downloadsRouter);

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "avlys-backend",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
  }),
);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} failed`, err);
  if (res.headersSent) return next(err);

  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith("CORS blocked:")) {
    return res.status(403).json({ detail: "Origin not allowed" });
  }

  return res.status(500).json({ detail: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Avlys backend running on port ${PORT}`);
});
