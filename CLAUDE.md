# CLAUDE.md — monitoring-kukang

## Aturan kerja

1. **Bahasa Indonesia**, singkat, langsung ke inti.
2. Setiap ada progres (fitur, perbaikan, deploy, keputusan user): update [Status & TODO](#status--todo)
   dan [Log progres](#log-progres) di file ini dalam commit/PR yang sama.
3. **Jangan tulis rahasia** di repo (password DB/MQTT, `JWT_SECRET`). Semua ada di `backend/.env`
   di server (tidak di-commit). Minta user menempel output, jangan minta isi `.env` utuh.
4. Claude tidak punya akses ke server; semua perintah server dijalankan user lalu output ditempel.

## Sistem

Monitoring lingkungan kandang kukang (Bogor). Alat IoT di kandang → broker MQTT → backend → PostgreSQL → dashboard.

```
alat ──MQTT──► broker 103.197.189.18:1883 ──► backend (Express, :5000) ──► PostgreSQL (localhost)
                                                   ▲ REST /api
                                    frontend React (build statis, :3004)
```

- **Topik MQTT**: `{kandangId}/kukang/{sensor}`, mis. `kandang-1/kukang/temperature`.
  Sensor: `temperature`, `humidity`, `light`, `noise`. Payload: angka (`25.3`) atau
  JSON `{"value": 25.3, "timestamp": ...}` (timestamp opsional; detik/ms/ISO; kalau tidak valid
  dipakai jam server). Backend subscribe `+/kukang/#` QoS 1, clientId tetap (`MQTT_CLIENT_ID`,
  default `kukang_backend`), `clean: false`.
- Broker: user `kukang` (password di `.env`), WebSocket `ws://103.197.189.18:9002` (tidak dipakai
  frontend; frontend hanya memanggil REST API).
- **Backend** (`backend/`): `server.js` → `src/app.js`. MQTT di `src/config/mqtt.js` (koneksi, status)
  dan `src/services/mqttService.js` (parsing, simpan ke `sensor_readings`). Alert di
  `src/services/alertService.js`: dicek tiap `ALERT_CHECK_INTERVAL` (60 s), tidak dicatat ulang bila
  masih ada alert sejenis belum di-resolve atau dalam cooldown `ALERT_COOLDOWN_MINUTES` (30).
- Endpoint penting: `/health` (status MQTT: `connected`, `lastMessageAt`, `lastError`),
  `/api/mqtt/info`, `GET /api/alerts`, `PUT /api/alerts/:id/resolve`.
- **Frontend** (`frontend/`): CRA (`react-scripts`). URL API dari `frontend/.env`
  `REACT_APP_API_URL=http://103.197.189.18:5000/api` (dibakar saat build → ubah = build ulang).
- Uji broker: `cd backend && npm run test-mqtt` (subscribe 30 detik, tampilkan pesan masuk);
  `npm run test-mqtt -- publish` juga kirim contoh ke `kandang-test/kukang/temperature`.

Variabel `backend/.env` (lihat `backend/.env.example`): `PORT`, `NODE_ENV`, `DB_*`, `JWT_SECRET`,
`MQTT_BROKER`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID`, `ALERT_CHECK_INTERVAL`,
`ALERT_COOLDOWN_MINUTES`, `CORS_ORIGINS` (saat ini `http://localhost:3000,http://103.197.189.18:3004`).

## Deploy (server `mail`, IP 103.197.189.18)

- Folder: `/mnt/data/iot-dev/202610-kukang-bogor` (milik `farhan`, clone repo ini, branch `main`).
- Proses dijalankan **PM2 milik user `dev-server-ids`** (PM2 v7, sudah auto-start via systemd).
  Server ini dipakai banyak aplikasi lain di PM2 yang sama — jangan sentuh selain `kukang-*`.

| PM2 name | Jalankan | Port |
|---|---|---|
| `kukang-backend` (id 49) | `npm start` di `backend/` | 5000 |
| `kukang-frontend-3004` (id 54) | `pm2 serve frontend/build 3004 --spa` | 3004 |
| `kukang-frontend` (50), `kukang-frontend-3001` (51) | sisa lama, `stopped`, boleh dihapus | – |

Semua perintah PM2 lewat `sudo -iu dev-server-ids pm2 ...`. Port 3004, 5000, 1883 di-ALLOW di ufw.

```bash
# Update backend
cd /mnt/data/iot-dev/202610-kukang-bogor && git pull && (cd backend && npm ci) \
  && sudo -iu dev-server-ids pm2 restart kukang-backend
# Update frontend (tidak perlu restart PM2)
cd frontend && npm ci && npm run build
# Cek
curl -s localhost:5000/health; curl -sI localhost:3004 | head -1
sudo -iu dev-server-ids pm2 logs kukang-backend --lines 30 --nostream
# Setelah menambah/menghapus proses PM2
sudo -iu dev-server-ids pm2 save
```

Log backend yang sehat: `✅ MQTT Broker connected (mqtt://103.197.189.18:1883)`,
`📡 BERHASIL SUBSCRIBE`, lalu per pesan `📩 RAW MQTT -> ...` diikuti `✨ DATABASE: ...`.
`⚠️ topik diabaikan` / `⚠️ sensor tidak dikenal` = format dari alat tidak cocok.

## Status & TODO

- [x] Audit MQTT + perbaikan listener & endpoint alerts (PR #2, merged).
- [x] Deploy di server: `.env` diarahkan ke broker 103.197.189.18 user `kukang`, backend di-restart
      (MQTT connected, `lastMessageAt` terisi → alat sudah mengirim), frontend diganti dari
      `npm start` (dev server, crash-loop 309× karena `react-scripts` hilang) ke build statis.
      Dari server: `/health` OK, `:3004` = 200.
- [ ] **Dashboard tidak bisa diakses dari laptop user** (port 3004 & 5000 timeout dari luar, padahal
      listen `0.0.0.0` dan di-ALLOW ufw). Dugaan: IP publik user kena aturan `DENY` ufw (ada beberapa
      `DENY IN` dari IP tertentu, mis. 182.10.97.94, 114.10.45.242, yang berada sebelum ALLOW), atau
      firewall di luar server. Langkah cek: IP publik laptop (`curl ifconfig.me`), bandingkan akses
      port 80 / 3055 (Docker, melewati ufw) / 3004, cek `ufw status numbered` & `/var/log/ufw.log`.
      Opsi bila port diblokir di luar: proxy lewat nginx (80/443) yang sudah terbuka.
- [x] Data alat tersimpan: `ROOM-01` (topic `ROOM-01/kukang/*`, client `ESP32_Kukang`, QoS 0, tiap ~5 menit).
- [ ] **Audit web/backend 2026-11-25 (temuan, belum diperbaiki)**:
  - Waktu: kolom `timestamp` = `timestamp without time zone`, isinya jam UTC; TZ server & PostgreSQL
    `Asia/Jakarta`. node-pg membacanya sebagai WIB lalu frontend `+7 jam` → kebetulan benar di layar.
    Rata-rata harian (7/30 hari) terpotong per hari UTC; statistik `NOW()-interval` geser 7 jam;
    `created_at` berisi jam WIB. Rencana: migrasi ke `timestamptz` (`USING timestamp AT TIME ZONE 'UTC'`),
    hapus `+7 jam` & hack ±420 menit di frontend, format pakai `timeZone: 'Asia/Jakarta'`.
  - Backend hanya kenal 4 sensor; `voltage/current/power` dibuang. `sensor_type` adalah ENUM PostgreSQL
    → perlu `ALTER TYPE ... ADD VALUE`.
  - Tabel riwayat/Excel membulatkan ke bawah per 5 menit (17:17 → 17:15); grafik sumbu X kategori
    (celah tidak terlihat, garis selalu tersambung).
  - Ambang alert (cahaya 100–1000 lux, suara ≤70 dB) tidak cocok dengan kondisi nyata (2,7 lux, 75–80 dB).
  - Mosquitto: tanpa ACL (semua user bisa baca/tulis semua topik), `queue_qos0_messages` tidak diset
    (data QoS 0 hilang saat backend putus). `kukang_backend` unik, tidak bentrok dengan alat.
  - Keamanan: 5432 listen `0.0.0.0` + ufw ALLOW Anywhere (terbuka publik); 3306/6380 hanya
    127.0.0.1 (aturan ufw-nya sisa, tidak berbahaya). Jangan tutup 5432 sebelum dipastikan tidak
    dipakai aplikasi lain dari luar.
- [ ] Pastikan `pm2 save` sudah dijalankan setelah `kukang-frontend-3004` dibuat ulang.
- [ ] Opsional: hapus PM2 id 50 & 51; `npm audit` frontend banyak peringatan (CRA lama).

## Log progres

- **2026-11-25** — Audit: backend belum ke broker 103.197.189.18 (default `38.47.176.109`). Perbaikan
  (PR #2): default broker baru, status koneksi akurat, `disconnect()`, QoS 1 + sesi persisten,
  validasi/log topik, timestamp dari payload, alert tanpa duplikat, `scripts/test-mqtt.js`,
  `GET/PUT /api/alerts` aktif, `AlertPanel` membaca `response.data.data`.
- **2026-11-25** — Deploy di server `mail` (PM2 `dev-server-ids`): update `.env` MQTT, restart
  `kukang-backend`, frontend jadi `pm2 serve` build statis di 3004. Masalah tersisa: akses dari
  laptop user timeout (sedang didiagnosis, lihat TODO).
- **2026-11-25** — Verifikasi audit checklist web/backend terhadap kode + output VPS (lihat TODO
  "Audit web/backend"). Belum ada perubahan kode.
