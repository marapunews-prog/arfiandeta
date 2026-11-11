(function () {
  "use strict";
  var PAGES = [["index.html", "Beranda", "home"], ["tulisan.html", "Tulisan", "tulisan"], ["agenda.html", "Agenda", "agenda"], ["advokasi.html", "Advokasi", "advokasi"], ["tentang.html", "Tentang", "tentang"], ["kontak.html", "Kontak", "kontak"]];
  var CATS = ["Lingkungan", "Masyarakat Adat", "Sosial", "Pemerintahan"];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var D, page = document.body.dataset.page, filt = "all", q = "";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inline(t) {
    return t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
  }
  // Teks sederhana: paragraf, "## judul", "- daftar", **tebal**, [tautan](https://...)
  function rich(text) {
    return String(text || "").split(/\n\s*\n/).map(function (b) {
      b = b.trim(); if (!b) return "";
      var L = b.split("\n");
      if (/^##\s/.test(b)) return "<h2>" + inline(esc(b.replace(/^##\s+/, ""))) + "</h2>";
      if (/^###\s/.test(b)) return "<h3>" + inline(esc(b.replace(/^###\s+/, ""))) + "</h3>";
      if (L.every(function (l) { return /^[-*]\s/.test(l); })) return "<ul>" + L.map(function (l) { return "<li>" + inline(esc(l.replace(/^[-*]\s+/, ""))) + "</li>"; }).join("") + "</ul>";
      return "<p>" + inline(esc(b)).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }
  function fmt(d) { try { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return d; } }
  function mins(t) { return Math.max(1, Math.round(String(t || "").split(/\s+/).length / 200)); }
  function posts() { return (D.posts || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); }
  function meta(name, val, prop) {
    var el = document.querySelector("meta[" + (prop ? "property" : "name") + '="' + name + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(prop ? "property" : "name", name); document.head.appendChild(el); }
    el.setAttribute("content", val);
  }
  function setTitle(t, desc) {
    document.title = t ? t + " | " + D.s.name : D.s.name + " – " + D.s.k.split("·")[0].trim();
    if (desc) { meta("description", desc); meta("og:description", desc, 1); }
    meta("og:title", document.title, 1); meta("og:type", "website", 1); meta("og:site_name", D.s.name, 1);
  }

  /* ---------- kerangka ---------- */
  function shell() {
    var s = D.s, ini = (s.name || "SCM").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    var nav = PAGES.map(function (p) { return '<a href="' + p[0] + '"' + (p[2] === page || (page === "artikel" && p[2] === "tulisan") ? ' class="on" aria-current="page"' : "") + ">" + p[1] + "</a>"; }).join("");
    $("#hdr").innerHTML = '<a class="skip" href="#main">Lewati ke konten</a><header class="top"><div class="wrap"><a class="logo" href="index.html"><i>' + esc(ini) + "</i>" + esc(s.name) + '</a><button id="menu" aria-expanded="false" aria-controls="nav">Menu</button><nav class="main" id="nav" aria-label="Utama">' + nav + "</nav></div></header>";
    $("#ftr").innerHTML = '<footer class="foot"><div class="wrap"><div class="fg"><div><h4>' + esc(s.name) + "</h4><p>" + esc(s.t) + "</p></div><div><h4>Halaman</h4><ul>" +
      PAGES.map(function (p) { return '<li><a href="' + p[0] + '">' + p[1] + "</a></li>"; }).join("") + "</ul></div><div><h4>Kontak</h4><ul>" +
      (s.email ? '<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a></li>" : "") + (s.addr ? "<li>" + esc(s.addr) + "</li>" : "") + "<li>arfiandeta.com</li></ul></div></div>" +
      '<div class="cp"><span>© ' + new Date().getFullYear() + " " + esc(s.name) + '. Semua hak dilindungi.</span><a href="admin/">Masuk Admin</a></div></div></footer>';
    var b = $("#menu");
    b.onclick = function () { var o = $("#nav").classList.toggle("open"); b.setAttribute("aria-expanded", o); };
  }

  /* ---------- komponen ---------- */
  function postCard(p) {
    return '<a class="card" href="artikel.html?id=' + encodeURIComponent(p.id) + '"><span class="tag">' + esc(p.cat) + "</span><h3>" + esc(p.title) + "</h3><p>" + esc(p.sum) + '</p><span class="meta">' + esc(fmt(p.date)) + " · " + mins(p.body) + " menit baca</span></a>";
  }
  function evCard(e) {
    return '<div class="ev"><div class="date">' + esc(e.day) + "<small>" + esc(e.mon) + '</small></div><div><h3>' + esc(e.title) + "</h3><p>" + esc(e.desc) + "</p>" + (e.place ? '<p class="meta" style="margin-top:6px">📍 ' + esc(e.place) + "</p>" : "") + "</div></div>";
  }
  function head(title, lead) { return '<div class="pagehead"><div class="wrap"><div class="crumb"><a href="index.html">Beranda</a> / ' + esc(title) + "</div><h1>" + esc(title) + "</h1><p>" + esc(lead) + "</p></div></div>"; }
  function cta() {
    return '<section><div class="wrap"><div class="cta"><div><h2>Punya keresahan atau usulan kebijakan?</h2><p>Sampaikan kepada kami. Setiap laporan menjadi bahan kajian dan advokasi.</p></div><a class="btn p" href="kontak.html">Hubungi Kami</a></div></div></section>';
  }

  /* ---------- halaman ---------- */
  var R = {
    home: function () {
      var s = D.s, P = posts().slice(0, 3);
      setTitle("", s.t);
      return '<section class="hero"><div class="wrap"><div class="kicker">' + esc(s.k) + "</div><h1>" + esc(s.h) + "</h1><p>" + esc(s.t) + '</p><a class="btn p" href="tulisan.html">Baca Analisis</a><a class="btn s" href="kontak.html">Bergabung dalam Diskusi</a></div></section>' +
        '<div class="wrap"><div class="stats"><div><b>' + D.posts.length + "</b><span>Tulisan & analisis</span></div><div><b>" + D.events.length + "</b><span>Agenda terbuka</span></div><div><b>" + D.focus.length + "</b><span>Bidang fokus</span></div><div><b>" + D.issues.length + "</b><span>Isu prioritas</span></div></div></div>" +
        '<section><div class="wrap"><div class="sec-h"><div><h2>Fokus Kerja</h2><p class="lead">Isu yang saling berkait di Sumba, dari hutan dan air hingga meja rapat DPRD.</p></div></div><div class="grid">' +
        D.focus.map(function (f) { return '<div class="card"><div class="ico" aria-hidden="true">' + esc(f.icon) + "</div><h3>" + esc(f.title) + "</h3><p>" + esc(f.text) + "</p></div>"; }).join("") + "</div></div></section>" +
        '<section class="alt"><div class="wrap"><div class="sec-h"><div><h2>Tulisan Terbaru</h2><p class="lead">Kajian, opini, dan catatan lapangan.</p></div><a class="btn o" href="tulisan.html">Semua tulisan →</a></div><div class="grid">' + (P.map(postCard).join("") || '<div class="empty">Belum ada tulisan.</div>') + "</div></div></section>" +
        '<section><div class="wrap"><div class="sec-h"><div><h2>Agenda Mendatang</h2></div><a class="btn o" href="agenda.html">Semua agenda →</a></div>' + (D.events.slice(0, 3).map(evCard).join("") || '<div class="empty">Belum ada agenda.</div>') + "</div></section>" + cta();
    },
    tulisan: function () {
      setTitle("Tulisan & Analisis", "Kajian, opini, dan catatan lapangan tentang kebijakan publik, lingkungan, dan masyarakat adat di Sumba.");
      return head("Tulisan & Analisis", "Kajian, opini, dan catatan lapangan.") + '<section><div class="wrap"><div class="tools"><input id="sq" type="search" placeholder="Cari tulisan…" aria-label="Cari tulisan"><div class="chips" id="chips"></div></div><div class="grid" id="plist"></div></div></section>';
    },
    artikel: function () {
      var id = new URLSearchParams(location.search).get("id"), p = D.posts.filter(function (x) { return x.id === id; })[0];
      if (!p) { setTitle("Tulisan tidak ditemukan"); return head("Tulisan tidak ditemukan", "Tulisan yang Anda cari tidak ada atau telah dihapus.") + '<section><div class="wrap"><a class="btn" href="tulisan.html">← Semua tulisan</a></div></section>'; }
      setTitle(p.title, p.sum);
      var rel = posts().filter(function (x) { return x.id !== p.id && x.cat === p.cat; }).slice(0, 3);
      return '<section><div class="wrap"><article class="art"><div class="art-h"><div class="crumb"><a href="tulisan.html">← Semua tulisan</a></div><span class="tag" style="margin-top:22px">' + esc(p.cat) + "</span><h1>" + esc(p.title) + '</h1><p class="sum">' + esc(p.sum) + '</p><p class="meta">' + (p.author ? esc(p.author) + " · " : "") + esc(fmt(p.date)) + " · " + mins(p.body) + ' menit baca</p><p><button class="btn o" id="share" style="margin-top:6px">Salin tautan</button></p></div><hr style="border:0;border-top:1px solid var(--line);margin:8px 0 28px">' + rich(p.body) + "</article></div></section>" +
        (rel.length ? '<section class="alt"><div class="wrap"><h2 style="margin-bottom:22px">Tulisan terkait</h2><div class="grid">' + rel.map(postCard).join("") + "</div></div></section>" : "");
    },
    agenda: function () {
      setTitle("Agenda", "Diskusi dan kelas edukasi terbuka untuk warga Sumba.");
      return head("Diskusi & Edukasi", "Agenda terbuka untuk warga.") + '<section><div class="wrap" style="max-width:820px">' + (D.events.map(evCard).join("") || '<div class="empty">Belum ada agenda.</div>') + "</div></section>" + cta();
    },
    advokasi: function () {
      setTitle("Advokasi", "Dari keresahan warga menjadi usulan kebijakan yang bisa dipertanggungjawabkan.");
      return head("Advokasi", "Dari keresahan warga menjadi usulan kebijakan yang bisa dipertanggungjawabkan.") + '<section><div class="wrap"><div class="cols"><div><h2 style="margin-bottom:24px">Cara Kerja</h2><ol class="steps">' +
        D.steps.map(function (s) { return "<li><b>" + esc(s.title) + "</b><span>" + esc(s.text) + "</span></li>"; }).join("") + '</ol></div><div class="card"><h3 style="font-size:22px;margin-bottom:12px">Isu Prioritas</h3><div class="tw"><table><tr><th>Isu</th><th>Bidang</th></tr>' +
        D.issues.map(function (i) { return "<tr><td>" + esc(i.issue) + "</td><td>" + esc(i.area) + "</td></tr>"; }).join("") + '</table></div><p style="margin-top:18px"><a class="btn" href="kontak.html">Laporkan Isu</a></p></div></div></div></section>';
    },
    tentang: function () {
      setTitle("Tentang", D.s.t);
      return head("Tentang " + D.s.name, D.s.t) + '<section><div class="wrap"><div class="art">' + rich(D.s.about) + '</div></div></section><section class="alt"><div class="wrap"><h2 style="margin-bottom:22px">Bidang Fokus</h2><div class="grid">' +
        D.focus.map(function (f) { return '<div class="card"><div class="ico" aria-hidden="true">' + esc(f.icon) + "</div><h3>" + esc(f.title) + "</h3><p>" + esc(f.text) + "</p></div>"; }).join("") + "</div></div></section>";
    },
    kontak: function () {
      setTitle("Kontak", "Kirim pesan, usulan topik, atau laporan isu kepada " + D.s.name + ".");
      return head("Kontak", "Kirim pesan, usulan topik, atau laporan isu.") + '<section><div class="wrap"><div class="cols"><div><h2>Terhubung</h2><p class="lead">Kami membaca setiap pesan.</p><p class="sans">' + (D.s.email ? '✉️ <a href="mailto:' + esc(D.s.email) + '">' + esc(D.s.email) + "</a><br>" : "") + (D.s.addr ? "📍 " + esc(D.s.addr) + "<br>" : "") + '🌐 arfiandeta.com</p></div><form id="cf" class="fm card"><div><label for="cn">Nama</label><input id="cn" required></div><div><label for="ce">Email</label><input id="ce" type="email" required></div><div><label for="cm">Pesan</label><textarea id="cm" rows="5" required></textarea></div><div><button class="btn" style="border:0">Kirim lewat Email</button></div></form></div></div></section>';
    }
  };

  function bind() {
    if (page === "tulisan") {
      var draw = function () {
        var l = posts().filter(function (p) { return (filt === "all" || p.cat === filt) && (!q || (p.title + " " + p.sum + " " + p.body).toLowerCase().indexOf(q) > -1); });
        $("#plist").innerHTML = l.map(postCard).join("") || '<div class="empty" style="grid-column:1/-1">Tidak ada tulisan yang cocok.</div>';
        $("#chips").innerHTML = ["all"].concat(CATS).map(function (c) { return '<button data-f="' + c + '" class="' + (c === filt ? "on" : "") + '">' + (c === "all" ? "Semua" : c) + "</button>"; }).join("");
      };
      draw();
      $("#chips").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { filt = b.dataset.f; draw(); } });
      $("#sq").addEventListener("input", function (e) { q = e.target.value.toLowerCase().trim(); draw(); });
    }
    if (page === "artikel" && $("#share")) $("#share").onclick = function () {
      var b = this; (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(function () { b.textContent = "Tautan tersalin ✓"; }, function () { prompt("Salin tautan:", location.href); });
    };
    if (page === "kontak") $("#cf").onsubmit = function (e) {
      e.preventDefault(); var v = function (i) { return $("#" + i).value; };
      location.href = "mailto:" + D.s.email + "?subject=" + encodeURIComponent("Pesan dari " + v("cn")) + "&body=" + encodeURIComponent(v("cm") + "\n\n" + v("cn") + " (" + v("ce") + ")");
    };
  }

  function ok(j) { return j && j.s && Array.isArray(j.posts) && Array.isArray(j.events); }
  function norm(j) { ["focus", "steps", "issues"].forEach(function (k) { if (!Array.isArray(j[k])) j[k] = []; }); return j; }
  async function load() {
    try { var r = await fetch("/api/content", { cache: "no-store" }); if (r.ok) { var j = await r.json(); if (ok(j)) return norm(j); } } catch (e) {}
    var r2 = await fetch("data/content.json", { cache: "no-cache" });
    return norm(await r2.json());
  }

  load().then(function (d) {
    D = d;
    shell();
    $("#main").innerHTML = (R[page] || R.home)();
    bind();
  }).catch(function () {
    $("#main").innerHTML = '<section><div class="wrap"><div class="empty">Konten gagal dimuat. Muat ulang halaman.</div></div></section>';
  });
})();
