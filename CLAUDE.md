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
  Sensor: `temperature`, `humidity`, `light`, `noise`, `voltage` (V), `current` (mA), `power` (mW;
  3 terakhir disimpan tapi tidak ditampilkan/diunduh). Payload: angka (`25.3`) atau
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
- [x] **Perbaikan audit web/backend (PR #4 & #5, deployed 2026-11-25)** — migrasi
  `backend/migrations/2026-11-25-timestamptz-dan-sensor-daya.sql` sudah dijalankan (kolom waktu
  `sensor_readings` & `alerts` = `timestamptz`; backup `~/kandang_kukang_pra_migrasi.dump` di server).
  Isi perbaikan: 7 sensor (`voltage` V, `current` mA, `power` mW) diterima & disimpan backend;
  **keputusan user: data kelistrikan tidak ditampilkan & tidak ikut diunduh** (dokter hewan tidak
  perlu) — frontend hanya suhu, kelembapan, cahaya, suara (`SENSORS` di `utils/sensors.js`); kolom waktu `timestamptz` (data lama: `timestamp` = UTC, `created_at`/alerts = WIB,
  sudah dicek selisih konsisten 07:00); frontend format WIB via `Intl` (`frontend/src/utils/time.js`),
  tanpa `+7 jam`; rata-rata 7/30 hari per hari WIB; grafik sumbu waktu, garis lurus, putus bila
  jeda >10 menit, pesan "Belum ada data"; tabel & CSV per siklus (pesan ≤60 dtk digabung,
  `frontend/src/utils/sensors.js`) dengan jam asli; Excel dokter tetap slot 5 menit + keterangan;
  status "Alat Online/Offline" (>15 menit) + "Terakhir terima data HH:mm WIB" dipasang di dashboard;
  batas data mentah 2000 → 20000 (CSV 31 hari tidak terpotong).
- [ ] **Keputusan user**: ambang alert cahaya (100–1000 lux) & suara (≤70 dB) di `SensorModel.getThresholds`
  tidak cocok dengan kondisi nyata (2,7 lux, 75–80 dB) → alert terus muncul. Ambang di kartu
  (`SensorCard`, badge disembunyikan) juga beda dengan backend.
- [ ] Mosquitto (broker dipakai bersama MIRRA): tanpa ACL (semua user baca/tulis semua topik);
  `queue_qos0_messages` tidak diset (data QoS 0 hilang saat backend putus). `passwd` sudah
  `root:mosquitto 640`. `kukang_backend` unik, tidak bentrok dengan `ESP32_Kukang`.
- [ ] Keamanan PostgreSQL 5432: listen `0.0.0.0`, ufw ALLOW Anywhere, `pg_hba` mengizinkan user `dev` &
  `organ1c` dari `0.0.0.0/0` (md5) dan `root` dari 46.250.227.91; ada koneksi dari container Docker
  (172.19.0.2). Bukan milik kukang (`kukang_user` hanya localhost) → putuskan bersama admin server,
  jangan tutup sepihak. 3306/6380 hanya listen 127.0.0.1 (aturan ufw sisa, tidak berbahaya).
- [ ] Broker lama 38.47.176.109: tidak ada koneksi di `ss`; tcpdump sebelumnya salah interface
  (`veth...`), ulangi dengan `-i any`.
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
- **2026-11-25** — Cek VPS: voltage/current/power ditolak backend (log err), ENUM `sensor_type` 4 nilai,
  data lama konsisten UTC. Perbaikan kode + migrasi SQL (lihat TODO). Diuji Playwright dengan API
  tiruan & browser zona UTC: jam tampil WIB benar, celah terlihat, 7 kartu, tabel/CSV/Excel benar,
  tanpa scroll horizontal (desktop & HP).
- **2026-11-25** — PR #4 merged. Keputusan user: tegangan/arus/daya disembunyikan dari dashboard,
  pratinjau, CSV & Excel (tetap disimpan di DB).
- **2026-11-25** — Deploy PR #4 & #5: migrasi DB jalan, backend restart, frontend build. Terverifikasi:
  7 sensor tersimpan, `max(timestamp)` = jam WIB sekarang (+07), tab History jam asli (18:10 = 18:10:07).
  Catatan alat: arus ~0,02 mA & daya 0 mW (tegangan 4,15 V) → cek sensor daya di sisi firmware.
