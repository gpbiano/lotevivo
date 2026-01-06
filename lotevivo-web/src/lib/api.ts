// src/lib/api.ts
import { getToken } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:3333";

function withLeadingSlash(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function safeGetToken() {
  // evita crash se alguém chamar no server (Server Components)
  if (typeof window === "undefined") return null;
  try {
    return getToken();
  } catch {
    return null;
  }
}

function authHeaders(extra?: Record<string, string>) {
  const token = safeGetToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res: Response) {
  // 204/205 não tem body
  if (res.status === 204 || res.status === 205) {
    if (!res.ok) {
      const err: any = new Error(res.statusText || "Erro na requisição");
      err.status = res.status;
      err.body = null;
      throw err;
    }
    return null;
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let body: any = null;
  try {
    body = isJson ? await res.json() : await res.text();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && (body as any).message) ||
      (typeof body === "string" && body) ||
      res.statusText ||
      "Erro na requisição";

    const err: any = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

type ApiInit = Omit<RequestInit, "method" | "headers" | "body">;

export async function apiGet(path: string, init?: ApiInit) {
  const res = await fetch(`${API_BASE}${withLeadingSlash(path)}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
    ...(init ?? {}),
  });
  return handle(res);
}

export async function apiPost(path: string, payload: any, init?: ApiInit) {
  const res = await fetch(`${API_BASE}${withLeadingSlash(path)}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload ?? {}),
    ...(init ?? {}),
  });
  return handle(res);
}

export async function apiPut(path: string, payload: any, init?: ApiInit) {
  const res = await fetch(`${API_BASE}${withLeadingSlash(path)}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload ?? {}),
    ...(init ?? {}),
  });
  return handle(res);
}

export async function apiPatch(path: string, payload: any, init?: ApiInit) {
  const res = await fetch(`${API_BASE}${withLeadingSlash(path)}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload ?? {}),
    ...(init ?? {}),
  });
  return handle(res);
}

export async function apiDelete(path: string, init?: ApiInit) {
  const res = await fetch(`${API_BASE}${withLeadingSlash(path)}`, {
    method: "DELETE",
    headers: authHeaders(),
    ...(init ?? {}),
  });
  return handle(res);
}

// ✅ multipart/form-data
export async function apiPostForm(path: string, formData: FormData, init?: ApiInit) {
  const res = await fetch(`${API_BASE}${withLeadingSlash(path)}`, {
    method: "POST",
    headers: authHeaders(), // NÃO setar Content-Type aqui (o browser seta boundary)
    body: formData,
    ...(init ?? {}),
  });
  return handle(res);
}
