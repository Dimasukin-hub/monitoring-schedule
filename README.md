# Great Giant Foods (PG1) — Integrated Agricultural Intelligence Portal

Sistem Portal Terpadu Operasional & Monitoring Kebun Plantation Group 1 (PG1) PT Great Giant Pineapple.

---

## 🌐 Production Domain & Routing

* **Domain Utama:** `https://fieldestablishment.estatepg1.online`

### Struktur Rute (*Next.js App Router*):
* `GET /` : **Portal Landing Page** — Halaman utama pemilihan portal operasional.
* `GET /labita` : **Portal Labita** — Monitoring pengolahan lahan, tren bero, mutu olah tanah, real tanam nanas, dan manajemen user.
* `GET /gorong-gorong` : **Portal Monitor Gorong-Gorong** — Rekapitulasi saldo fisik gorong-gorong 4 diameter, dropping lapangan, form order wilayah, master data lokasi, dan manajemen user.
* `GET /plant-maintenance` : Modul pemeliharaan fasilitas (tahap pengembangan).
* `GET /produksi` : Modul monitoring produksi & panen (tahap pengembangan).
* `GET /login` : Autentikasi Admin/User terintegrasi dengan redirect otomatis ke portal aktif.

---

## 🚀 Panduan Menjalankan Aplikasi

### Mode Pengembangan (Local Development):
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser.

### Mode Produksi (Build & Run):
```bash
npm run build
npm run start
```

---

## ⚙️ Konfigurasi Nginx di VPS

File konfigurasi Nginx di VPS (`/etc/nginx/sites-available/monitoring_schedule`):

```nginx
server {
    server_name fieldestablishment.estatepg1.online;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Mengaktifkan & Memasang SSL (Certbot):
```bash
sudo ln -s /etc/nginx/sites-available/monitoring_schedule /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d fieldestablishment.estatepg1.online
```

---

## 🛠️ Tech Stack
* **Framework:** Next.js (App Router, Turbopack, React 19)
* **Language:** TypeScript
* **Database & ORM:** PostgreSQL, Prisma
* **Styling & UI:** Tailwind CSS, Lucide Icons, Recharts
