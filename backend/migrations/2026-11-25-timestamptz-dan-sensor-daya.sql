-- Migrasi 2026-11-25
-- 1) Tambah sensor voltage/current/power ke ENUM sensor_type.
-- 2) Kolom waktu jadi timestamptz (titik waktu absolut, tampil WIB di frontend).
--
-- Fakta sebelum migrasi (dicek di server 2026-11-25):
--   sensor_readings."timestamp" berisi jam UTC (dari backend, ISO "...Z"),
--   sensor_readings.created_at & alerts.* berisi jam WIB (DEFAULT CURRENT_TIMESTAMP,
--   TimeZone server = Asia/Jakarta). Selisih created_at - timestamp konsisten 07:00.
--
-- Jalankan SEKALI, sebagai postgres, SETELAH backup:
--   sudo -u postgres pg_dump -Fc kandang_kukang > ~/kandang_kukang_pra_migrasi.dump
--   sudo -u postgres psql -d kandang_kukang -v ON_ERROR_STOP=1 -f backend/migrations/2026-11-25-timestamptz-dan-sensor-daya.sql
-- Lalu restart kukang-backend dan build ulang frontend (kode lama + skema baru = jam tampil +7).

-- ADD VALUE di luar transaksi (nilai baru tidak bisa dipakai di transaksi yang sama).
ALTER TYPE sensor_type ADD VALUE IF NOT EXISTS 'voltage';
ALTER TYPE sensor_type ADD VALUE IF NOT EXISTS 'current';
ALTER TYPE sensor_type ADD VALUE IF NOT EXISTS 'power';

BEGIN;

-- Lewati bila sudah timestamptz (aman dijalankan ulang).
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sensor_readings'
        AND column_name = 'timestamp') = 'timestamp without time zone' THEN
    ALTER TABLE sensor_readings
      ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC',
      ALTER COLUMN created_at  TYPE timestamptz USING created_at  AT TIME ZONE 'Asia/Jakarta';
  END IF;
END $$;

-- Semua kolom waktu di alerts berasal dari CURRENT_TIMESTAMP (jam WIB).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alerts'
      AND data_type = 'timestamp without time zone'
  LOOP
    EXECUTE format(
      'ALTER TABLE alerts ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE %L',
      c.column_name, c.column_name, 'Asia/Jakarta');
  END LOOP;
END $$;

COMMIT;

-- Cek: selisih harus 00:00 dan max(timestamp) tampil sebagai jam WIB (+07).
SELECT sensor_type, count(*), max("timestamp") AS terakhir,
       max(created_at - "timestamp") AS selisih
FROM sensor_readings GROUP BY 1 ORDER BY 1;
