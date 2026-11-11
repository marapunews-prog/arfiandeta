// GET /api/content  ->  konten situs (publik). Kosong (404) bila belum pernah disimpan dari panel;
// situs lalu memakai data/content.json bawaan.
import { store, json } from "./lib.mjs";

export default async () => {
  try {
    const c = await store().get("content");
    if (c && c.s) return json(c, 200, { "cache-control": "public, max-age=0, must-revalidate" });
  } catch (e) {
    return json({ error: "storage" }, 503);
  }
  return json({ empty: true }, 404);
};

export const config = { path: "/api/content" };
