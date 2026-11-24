# Alaska!

**Alaska!** adalah *dockable* CEP extension untuk **Adobe After Effects (CC 2020 ke atas)** yang dirancang untuk mempercepat alur kerja *editing*, *motion*, dan *compositing*—dibangun secara bertahap dengan bantuan AI dan dipantau langsung melalui pengujian di After Effects.

---

## Fitur yang Direncanakan & Sedang Dikembangkan

- **Graph & Keyframe Easing:** Kanvas *value graph* interaktif, *grid snapping*, *preset* kurva (*Smooth*, *Snappy*, *Linear*), serta *copy/paste* karakter *easing* ke *selected keyframes*.
- **Align & Layout:** Perataan posisi layer cepat (*Left*, *Center H*, *Right*, *Top*, *Center V*, *Bottom*) dan distribusi tata letak.
- **Custom Color Palette:** Penyimpanan *swatch* warna kustom serta penerapan cepat ke *Fill* atau *Stroke*.
- **Auto Precomp:** Membungkus *selected layers* ke dalam *pre-composition* dengan opsi nama kustom dan pemindahan atribut.
- **Auto Cut:** Pemotongan/pembagian layer secara cepat berdasarkan posisi *playhead* (CTI), *marker*, atau parameter tertentu.
- **Auto Beat:** Penandaan *marker* atau pemotongan mengikuti ritme/*beat* audio.
- **Custom Background (Looping MP4):** Memasukkan *asset* video `.mp4` sebagai latar belakang, menyesuaikan ukuran ke *composition*, dan mengatur *looping*.

---

## Struktur Proyek

```text
Alaska!/
├── CSXS/
│   └── manifest.xml
├── client/
│   ├── index.html
│   └── main.js
├── host/
│   ├── index.jsx
│   ├── align.jsx
│   ├── precomp.jsx
│   └── graph.jsx
└── lib/
    └── CSInterface.js
