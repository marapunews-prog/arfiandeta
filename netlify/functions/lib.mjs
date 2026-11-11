// Pustaka bersama untuk Netlify Functions (penyimpanan, autentikasi, validasi).
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";

export const CATS = ["Lingkungan", "Masyarakat Adat", "Sosial", "Pemerintahan"];
const DEFAULT_PW = "admin123";
const TOKEN_TTL = 8 * 3600; // detik

// ---------- Penyimpanan ----------
// Produksi: Netlify Blobs. Uji lokal: set SCM_LOCAL_DIR=/folder untuk memakai berkas biasa.
export function store() {
  const dir = process.env.SCM_LOCAL_DIR;
  if (dir) {
    const p = (k) => path.join(dir, k.replace(/[^a-z0-9_-]/gi, "_") + ".json");
    return {
      async get(k) { try { return JSON.parse(await fs.readFile(p(k), "utf8")); } catch { return null; } },
      async setJSON(k, v) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(p(k), JSON.stringify(v)); },
    };
  }
  const s = getStore({ name: "scm", consistency: "strong" });
  return {
    get: (k) => s.get(k, { type: "json" }),
    setJSON: (k, v) => s.setJSON(k, v),
  };
}

// ---------- Respons ----------
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra },
  });
}

// ---------- Validasi isi ----------
const cut = (v, n) => (typeof v === "string" ? v.replace(/\0/g, "").slice(0, n) : "");
const cid = (v) => {
  const s = typeof v === "string" ? v.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) : "";
  return s || randomBytes(5).toString("hex");
};
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === "object") : []);

export function sanitize(inp) {
  const i = inp && typeof inp === "object" ? inp : {};
  const s = i.s && typeof i.s === "object" ? i.s : {};
  let email = cut(s.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = "";
  return {
    v: Date.now(),
    s: {
      name: cut(s.name, 80), k: cut(s.k, 160), h: cut(s.h, 240), t: cut(s.t, 600),
      email, addr: cut(s.addr, 200), about: cut(s.about, 8000),
    },
    focus: list(i.focus, 12).map((x) => ({ id: cid(x.id), icon: cut(x.icon, 8), title: cut(x.title, 100), text: cut(x.text, 300) })),
    steps: list(i.steps, 12).map((x) => ({ id: cid(x.id), title: cut(x.title, 120), text: cut(x.text, 300) })),
    issues: list(i.issues, 40).map((x) => ({ id: cid(x.id), issue: cut(x.issue, 150), area: cut(x.area, 60) })),
    posts: list(i.posts, 500).map((x) => {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(x.date || "") ? x.date : new Date().toISOString().slice(0, 10);
      return {
        id: cid(x.id), cat: CATS.includes(x.cat) ? x.cat : CATS[0], title: cut(x.title, 200), sum: cut(x.sum, 400),
        author: cut(x.author, 80), date, body: cut(x.body, 60000),
      };
    }),
    events: list(i.events, 200).map((x) => ({
      id: cid(x.id), day: cut(x.day, 4), mon: cut(x.mon, 6).toUpperCase(), title: cut(x.title, 200),
      place: cut(x.place, 120), desc: cut(x.desc, 600),
    })),
  };
}

// ---------- Autentikasi ----------
async function secret(st) {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  let r = await st.get("secret");
  if (!r || !r.k) { r = { k: randomBytes(32).toString("hex") }; await st.setJSON("secret", r); }
  return r.k;
}
export async function rotateSecret(st) { await st.setJSON("secret", { k: randomBytes(32).toString("hex") }); }

function b64u(b) { return Buffer.from(b).toString("base64url"); }
export async function makeToken(st) {
  const body = b64u(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }));
  const sig = createHmac("sha256", await secret(st)).update(body).digest("base64url");
  return body + "." + sig;
}
export async function checkToken(st, req) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [body, sig] = t.split(".");
  if (!body || !sig) return false;
  const want = createHmac("sha256", await secret(st)).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()).exp > Date.now() / 1000; } catch { return false; }
}

export function hashPw(pw) {
  const salt = randomBytes(16);
  return salt.toString("hex") + ":" + scryptSync(pw, salt, 32).toString("hex");
}
function verifyHash(pw, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const got = scryptSync(pw, Buffer.from(salt, "hex"), 32), want = Buffer.from(hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}
const safeEq = (a, b) => {
  const x = createHmac("sha256", "k").update(String(a)).digest(), y = createHmac("sha256", "k").update(String(b)).digest();
  return timingSafeEqual(x, y);
};

// Urutan prioritas: hash dari panel > variabel ADMIN_PASSWORD > bawaan "admin123"
// Pemulihan: set ADMIN_FORCE=1 bersama ADMIN_PASSWORD agar variabel mengalahkan password dari panel.
const forced = () => process.env.ADMIN_FORCE === "1" && !!process.env.ADMIN_PASSWORD;
export async function passwordState(st) {
  const a = forced() ? null : await st.get("auth");
  return { hash: a && a.hash ? a.hash : "", isDefault: !(a && a.hash) && !process.env.ADMIN_PASSWORD };
}
export async function checkPassword(st, pw) {
  const a = forced() ? null : await st.get("auth");
  if (a && a.hash) return verifyHash(pw, a.hash);
  return safeEq(process.env.ADMIN_PASSWORD || DEFAULT_PW, pw);
}

// ---------- Pembatasan percobaan login (per instans; lapisan tambahan) ----------
const tries = new Map();
export function ipOf(req, ctx) {
  return (ctx && ctx.ip) || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0";
}
export function blocked(ip) {
  const now = Date.now(), l = (tries.get(ip) || []).filter((t) => t > now - 900000);
  tries.set(ip, l);
  return l.length >= 5;
}
export function fail(ip) { const l = tries.get(ip) || []; l.push(Date.now()); tries.set(ip, l); }
export function clear(ip) { tries.delete(ip); }
