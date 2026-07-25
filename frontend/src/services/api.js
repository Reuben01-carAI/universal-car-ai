export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

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
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data;
}

export async function getVehicleProfile() {
  return parseResponse(await fetch(`${API_URL}/vehicle-profile`, { headers: userHeaders() }));
}

export async function saveVehicleProfile(profile) {
  return parseResponse(await fetch(`${API_URL}/vehicle-profile`, {
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
  return parseResponse(await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: userHeaders(),
    body: form,
  }));
}
