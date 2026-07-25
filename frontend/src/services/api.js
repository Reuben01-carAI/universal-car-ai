// Public FastAPI backend deployed on Vercel.
// Hard-coded for submission reliability so the production build does not depend on a local .env file.
export const API_URL = "https://universal-car-ai-y3ie.vercel.app";

const USER_KEY = "universal-car-ai-anonymous-user";

export function getAnonymousUserId() {
  let userId = localStorage.getItem(USER_KEY);
  if (!userId) {
    userId = globalThis.crypto?.randomUUID?.() || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(USER_KEY, userId);
  }
  return userId;
}

export function userHeaders(extra = {}) {
  return { "X-User-ID": getAnonymousUserId(), ...extra };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { detail: await response.text() };

  if (!response.ok) {
    const message = typeof data?.detail === "string"
      ? data.detail
      : JSON.stringify(data?.detail || data || {});
    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The AI request timed out. Please try again.");
    }
    throw new Error(`Cannot connect to the AI backend: ${error?.message || "network error"}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVehicleProfile() {
  return parseResponse(await apiFetch("/vehicle-profile", {
    headers: userHeaders(),
  }));
}

export async function saveVehicleProfile(profile) {
  return parseResponse(await apiFetch("/vehicle-profile", {
    method: "POST",
    headers: userHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(profile),
  }));
}

export async function askCarAI(question, history = [], imageFile = null) {
  const form = new FormData();
  form.append("question", question || "");
  form.append("history", JSON.stringify(history));
  if (imageFile) form.append("image", imageFile);

  return parseResponse(await apiFetch("/ask", {
    method: "POST",
    headers: userHeaders(),
    body: form,
  }));
}
