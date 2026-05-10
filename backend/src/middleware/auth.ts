import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Missing or invalid Authorization header" });
    return;
  }
  const token = auth.slice(7).trim();
  const tokenSegments = token.split(".").length;
  if (tokenSegments !== 3) {
    console.warn("[auth] rejected malformed bearer token", {
      path: req.path,
      tokenSegments,
    });
    res.status(401).json({ detail: "Invalid or expired token" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? "";

  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ detail: "Server auth is not configured" });
    return;
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let result: Awaited<ReturnType<typeof admin.auth.getUser>>;
  try {
    result = await admin.auth.getUser(token);
  } catch (error) {
    console.warn("[auth] failed to verify bearer token", {
      path: req.path,
      reason: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({ detail: "Invalid or expired token" });
    return;
  }

  const { data, error } = result;
  if (!data.user) {
    console.warn("[auth] rejected bearer token", {
      path: req.path,
      reason: error?.message ?? "no user returned",
    });
    res.status(401).json({ detail: "Invalid or expired token" });
    return;
  }

  res.locals.userId = data.user.id;
  res.locals.userEmail = data.user.email?.toLowerCase() ?? "";
  res.locals.token = token;
  next();
}
