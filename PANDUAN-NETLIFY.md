# SCM Sumba di Netlify (gratis)

Situs multi-halaman + panel admin bergaya cPanel. Konten disimpan di **Netlify Blobs** lewat **Netlify Functions**, keduanya tersedia di paket gratis. Tanpa PHP dan tanpa database.

## Struktur

| Lokasi | Fungsi |
|---|---|
| `public/*.html` | Halaman: Beranda, Tulisan, Artikel, Agenda, Advokasi, Tentang, Kontak, 404 |
| `public/assets/` | `site.css`, `site.js`, favicon |
| `public/admin/` | Panel admin (`/admin/`) |
| `public/data/content.json` | Data bawaan (dipakai sebelum ada simpanan dari panel) |
| `netlify/functions/` | `content.mjs` (publik), `admin.mjs` (login/simpan/password), `lib.mjs` |
| `netlify.toml`, `package.json` | Konfigurasi build |

## Cara deploy

Fungsi server butuh build, jadi **jangan** pakai drag-and-drop folder di Netlify Drop. Pilih salah satu:

**A. Lewat GitHub (disarankan)**
1. Ekstrak ZIP, unggah isinya ke repositori GitHub baru.
2. Netlify → *Add new site → Import an existing project* → pilih repositori.
3. Biarkan pengaturan terbaca otomatis dari `netlify.toml` (publish: `public`, functions: `netlify/functions`) → *Deploy*.

**B. Lewat Netlify CLI**
```
npm i -g netlify-cli
cd scm-netlify && npm install
netlify deploy --prod
```

## Setelah deploy

1. **Atur password awal (disarankan):** Site configuration → Environment variables → tambah `ADMIN_PASSWORD` dengan password kuat → *Trigger deploy*. Tanpa variabel ini, password bawaan adalah `admin123` (panel menampilkan peringatan).
2. Buka `https://NAMA-SITUS.netlify.app/admin/` dan masuk.
3. Ganti password lewat menu *Password* bila mau. Password dari panel disimpan sebagai hash dan **mengalahkan** `ADMIN_PASSWORD`.
4. Domain sendiri: Domain management → *Add a domain* → `arfiandeta.com` (atau subdomain, mis. `scm.arfiandeta.com`).

## Lupa password

1. Netlify → Site configuration → Environment variables: set `ADMIN_PASSWORD` = password baru **dan** `ADMIN_FORCE` = `1`.
2. Trigger deploy, lalu masuk dengan password baru.
3. Setelah masuk, hapus `ADMIN_FORCE` (atau biarkan; selama ada, password dari panel diabaikan) dan deploy ulang.

## Cara kerja

- Pengunjung membaca `/api/content`. Jika belum pernah ada simpanan dari panel, situs memakai `data/content.json`.
- Setiap *Simpan* di panel menulis ke Netlify Blobs dan langsung tampil untuk semua pengunjung, tanpa deploy ulang. Versi sebelumnya disalin otomatis sebagai cadangan.
- **Ekspor / Impor** di panel menghasilkan atau memuat file JSON. Untuk menjadikan data tertentu sebagai bawaan, ganti `public/data/content.json` dengan hasil ekspor.
- Isi tulisan mendukung: paragraf, `## Judul`, daftar `- item`, `**tebal**`, dan `[teks](https://tautan)`.

## Keamanan

- Sesi memakai token bertanda tangan (HMAC) berlaku 8 jam; ganti password mencabut semua sesi lama.
- Login dibatasi 5 kali gagal per 15 menit per IP, ditambah jeda 0,6 detik tiap salah. Pembatasan ini per instans fungsi, jadi pakai password yang kuat.
- Server memvalidasi dan membatasi panjang semua isi sebelum disimpan; situs publik meng-escape semua teks.
- `/admin/` ditandai `noindex` dan tidak di-cache.

## Mode lokal

Bila panel dibuka tanpa fungsi server (mis. `python -m http.server`), panel masuk **mode lokal**: perubahan hanya di browser itu. Berguna untuk mencoba tampilan; gunakan Ekspor untuk membawa hasilnya.

## Pengujian lokal dengan fungsi

```
npm install
npx netlify-cli dev
```
