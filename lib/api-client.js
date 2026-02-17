const BASE = "/api/room";

async function api(method, body, params) {
  const url = params ? `${BASE}?${new URLSearchParams(params)}` : BASE;
  const res = await fetch(url, {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const roomApi = {
  poll: (code) => api("GET", null, { code }),
  create: (playerId, playerName) => api("POST", { action: "create", playerId, playerName }),
  join: (code, playerId, playerName) => api("POST", { action: "join", code, playerId, playerName }),
  move: (code, playerId, col) => api("POST", { action: "move", code, playerId, col }),
  rematch: (code, playerId) => api("POST", { action: "rematch", code, playerId }),
};
