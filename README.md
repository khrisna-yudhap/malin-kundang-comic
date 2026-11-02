# Malin Kundang — Komik Web Interaktif (Scroll-Driven Graphic Story)

Situs web statis murni tanpa bundler atau proses build yang rumit. Proyek ini dapat langsung dibuka di browser lokal maupun diunggah ke hosting statis mana pun.

**Teknologi yang Digunakan:** RequireJS · Backbone + Underscore · jQuery · GSAP 3 + ScrollTrigger · Three.js r149 · Modernizr · Detectizr.

---

## Cara Menjalankan

### Cara 1: Buka Langsung (Double-Click / 100% Offline)
Proyek ini sudah dilengkapi dengan library vendor lokal dan script data mandiri:
1. Ekstrak atau buka folder `malin-kundang-comic/`.
2. **Klik dua kali (double-click) file `index.html`** di Finder (Mac) atau File Explorer (Windows).
3. Komik langsung terbuka dan berjalan normal di browser (Chrome, Safari, Firefox, Edge) tanpa perlu koneksi internet atau server HTTP.

### Cara 2: Menjalankan via Local Web Server (Opsional)
Jika Anda ingin menjalankan proyek melalui server HTTP lokal (misalnya untuk development):

**Menggunakan Python 3:**
```bash
cd malin-kundang-comic
python3 -m http.server 8000
```
Lalu buka browser di: `http://localhost:8000`

**Menggunakan Node.js / npx:**
```bash
cd malin-kundang-comic
npx serve .
```

---

## Verifikasi dan Pengujian

Sebelum mendeploy atau membagikan proyek, Anda dapat memverifikasi sintaks file JavaScript dan kelengkapan aset:

```bash
node tools/verify.js
```

### Parameter Debug di URL:
- `?nowebgl=1` : Memaksa mode canvas 2D fallback (tanpa WebGL).
- `?reducedmotion=1` : Memaksa mode hemat gerak (reduced motion).
- Deep-link chapter: `#/chapter/<id-chapter>`

---

## Struktur Folder

```
index.html                     Struktur kontainer utama & pemanggil script
styles/main.css                Gaya visual, layout multi-panel, 3D card tilt & animasi
scripts/
  vendor/                      Library pihak ketiga (RequireJS, jQuery, Underscore, Backbone, GSAP, Three.js)
  flightcheck.js               Pengecekan kapabilitas browser sebelum aplikasi dijalankan
  main.js                      Konfigurasi RequireJS & pemuat modul
  app.js                       Inisialisasi aplikasi, router, event bus & intro
  router.js                    Penanganan routing deep-link (#/chapter/:id)
  models/                      Model Backbone (story.js, scene.js)
  collections/                 Koleksi Backbone (scenes.js)
  views/                       Komponen tampilan (appView, sceneView, preloaderView, titleView, dsb.)
  services/                    Layanan pembantu (device.js, scroll.js, anim.js, audio.js)
  data/
    story.json                 Manifest data cerita & scene (JSON)
    story-data.js              Data cerita format JS untuk dukungan double-click file://
img/                           Aset gambar latar & panel komik
audio/                         Aset audio / loop suara latar (opsional)
tools/verify.js                Skrip verifikasi aset dan sintaks
```

---

## Konfigurasi Cerita (`scripts/data/story.json`)

Setiap panel atau adegan dikonfigurasi melalui `scripts/data/story.json`.

Contoh struktur scene komik multi-panel:

```json
{
  "type": "multi",
  "layout": "stagger-right",
  "frames": [
    {
      "src": "img/scenes/segment-one/panels/segmen1 04.PNG",
      "bubbles": [
        {
          "src": "img/scenes/segment-one/text-bubble/bubble-3-segment1-04-01.PNG",
          "origin": "46.2% 50.0%"
        }
      ]
    },
    {
      "src": "img/scenes/segment-one/panels/segmen1 05.PNG",
      "bubbles": [
        {
          "src": "img/scenes/segment-one/text-bubble/bubble-4-segment1-05-01.PNG",
          "origin": "59.3% 23.1%"
        }
      ]
    }
  ]
}
```

> **Catatan:** Jika Anda mengubah `scripts/data/story.json`, pastikan juga memperbarui `scripts/data/story-data.js` agar pembukaan file secara offline (double click) tetap sinkron.

---

## Panduan Ekspor Aset Gambar

- **Ukuran Kanvas:** Gunakan ukuran proporsional yang konsisten (misal: rasio 16:9 atau 16:10).
- **Format:** Disarankan menggunakan format PNG berkualitas tinggi atau WebP transparan untuk panel berlapis.
- **Nama File:** `img/scenes/<id-scene>/panels/<nama-panel>.png`.

---

## Deployment ke Hosting Web

Proyek ini siap diunggah langsung ke layanan static web hosting tanpa perlu proses build:

- **Netlify:** Drag & drop seluruh folder proyek ke dashboard Netlify, atau gunakan perintah `netlify deploy --prod`.
- **Cloudflare Pages:** Unggah langsung folder proyek melalui dashboard Cloudflare Pages.
- **GitHub Pages:** Push repositori ke GitHub → Masuk ke **Settings** → **Pages** → Pilih branch utama dan folder `/ (root)`.

### Caption timing cheat sheet

| Field | Meaning |
|---|---|
| `phase` | `"start"` (boat pause), `"move"` (camera move), `"end"` (wave pause) or `"all"`: which part `at`/`dur` refer to |
| `at` | when it starts, as a fraction of that part (0 = start, 1 = end) |
| `enter: "scroll"` + `enterDur` | slides up from below; `enterDur` = screens of scroll it takes (default 1 = moves with the page) |
| `dur` | how long it stays still after entering (fraction of the part; tiny = no stop) |
| `exit: "scroll"` + `exitDur` | slides up off the top; `exitDur` = screens of scroll it takes (default 1) |
| `cueTransition` | `true`/0..1: the white transition starts that far through this caption's exit |
