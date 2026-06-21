const BASE = "http://localhost:3000";

export type DrawingSummary = {
  id: string;
  lobbyName: string;
  title: string;
  thumbnail: string;
  createdAt: string;
};

export const saveDrawing = async (payload: {
  lobbyId: string;
  title: string;
  thumbnail: string;
}): Promise<DrawingSummary> => {
  const res = await fetch(`${BASE}/api/drawings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Speichern fehlgeschlagen");
  return await res.json();
};

export const listDrawings = async (): Promise<DrawingSummary[]> => {
  const res = await fetch(`${BASE}/api/drawings`, { credentials: "include" });
  if (!res.ok) throw new Error("Laden fehlgeschlagen");
  return await res.json();
};

export const loadDrawing = async (id: string, lobbyId: string): Promise<void> => {
  const res = await fetch(`${BASE}/api/drawings/${id}/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ lobbyId }),
  });
  if (!res.ok) throw new Error("Laden fehlgeschlagen");
};

export const deleteDrawing = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE}/api/drawings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Löschen fehlgeschlagen");
};
