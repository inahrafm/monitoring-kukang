// Urutan & satuan sesuai kontrak data alat (nilai sudah dikalibrasi di firmware).
export const SENSORS = [
  { key: "temperature", label: "Suhu", unit: "°C" },
  { key: "humidity", label: "Kelembapan", unit: "%" },
  { key: "light", label: "Cahaya", unit: "Lux" },
  { key: "noise", label: "Suara", unit: "dB" },
  { key: "voltage", label: "Tegangan", unit: "V" },
  { key: "current", label: "Arus", unit: "mA" },
  { key: "power", label: "Daya", unit: "mW" },
];
export const SENSOR_KEYS = SENSORS.map((s) => s.key);
export const ENV_SENSOR_KEYS = ["temperature", "humidity", "light", "noise"];
export const sensorMeta = (key) =>
  SENSORS.find((s) => s.key === key) || { key, label: key, unit: "" };

// Ketujuh topic satu siklus dikirim berurutan (retry s.d. 3x), jam terimanya
// bisa selisih beberapa detik. Gabungkan jadi satu baris bila masih dalam
// CYCLE_WINDOW_MS dari pesan pertama siklus dan sensornya belum terisi.
export const CYCLE_WINDOW_MS = 60 * 1000;

// bySensor: { [sensorKey]: [{ timestamp, value }, ...] }
// Hasil: [{ t: <ms>, temperature: 23.8, ... }] urut naik.
export function groupCycles(bySensor) {
  const all = [];
  Object.entries(bySensor).forEach(([key, rows]) => {
    (rows || []).forEach((r) => {
      const t = new Date(r.timestamp).getTime();
      const v = Number(r.value);
      if (Number.isFinite(t) && Number.isFinite(v)) all.push({ t, key, v });
    });
  });
  all.sort((a, b) => a.t - b.t);
  const rows = [];
  let cur = null;
  all.forEach(({ t, key, v }) => {
    if (!cur || t - cur.t > CYCLE_WINDOW_MS || cur[key] !== undefined) {
      cur = { t };
      rows.push(cur);
    }
    cur[key] = v;
  });
  return rows;
}

export const extractRows = (res) =>
  Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
