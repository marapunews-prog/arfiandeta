// /api/admin?a=ping|login|me|save|passwd|logout   (semua POST kecuali ping/me)
import { store, json, sanitize, makeToken, checkToken, hashPw, checkPassword, passwordState, rotateSecret, ipOf, blocked, fail, clear } from "./lib.mjs";

export default async (req, context) => {
  const a = new URL(req.url).searchParams.get("a") || "ping";
  const post = req.method === "POST";
  if (a === "ping") return json({ ok: true, mode: "api" });

  let st;
  try { st = store(); } catch (e) { return json({ error: "Penyimpanan belum siap: " + e.message }, 503); }

  let body = {};
  if (post) {
    const raw = await req.text();
    if (raw.length > 4_000_000) return json({ error: "Data terlalu besar." }, 413);
    try { body = JSON.parse(raw || "{}"); } catch { return json({ error: "Format data salah." }, 400); }
  }

  if (a === "login" && post) {
    const ip = ipOf(req, context);
    if (blocked(ip)) return json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, 429);
    const pw = typeof body.password === "string" ? body.password : "";
    if (!(await checkPassword(st, pw))) {
      fail(ip);
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: "Password salah." }, 401);
    }
    clear(ip);
    const ps = await passwordState(st);
    return json({ ok: true, token: await makeToken(st), default_pw: ps.isDefault });
  }

  if (!(await checkToken(st, req))) return json({ error: "Sesi berakhir. Silakan masuk lagi." }, 401);

  if (a === "me") {
    const ps = await passwordState(st);
    return json({ ok: true, default_pw: ps.isDefault, env_pw: !!process.env.ADMIN_PASSWORD, runtime: "Netlify Functions" });
  }

  if (a === "save" && post) {
    const clean = sanitize(body.data);
    const prev = await st.get("content");
    if (prev) await st.setJSON("content_backup", prev);
    await st.setJSON("content", clean);
    return json({ ok: true, data: clean });
  }

  if (a === "passwd" && post) {
    const old = typeof body.old === "string" ? body.old : "", nw = typeof body.new === "string" ? body.new : "";
    if (!(await checkPassword(st, old))) return json({ error: "Password lama salah." }, 400);
    if (nw.length < 8) return json({ error: "Password baru minimal 8 karakter." }, 400);
    await st.setJSON("auth", { hash: hashPw(nw) });
    await rotateSecret(st); // semua sesi lama otomatis tidak berlaku
    return json({ ok: true, token: await makeToken(st) });
  }

  if (a === "logout" && post) return json({ ok: true });

  return json({ error: "Aksi tidak dikenal." }, 404);
};

export const config = { path: "/api/admin" };
