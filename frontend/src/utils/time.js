// Semua tampilan waktu memakai WIB (Asia/Jakarta, UTC+7 tanpa DST),
// apa pun zona waktu browser. Backend mengirim timestamp ISO absolut (timestamptz).
export const TZ = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function wibParts(input) {
  const p = {};
  partsFmt.formatToParts(new Date(input)).forEach((x) => {
    if (x.type !== "literal") p[x.type] = x.value;
  });
  return p; // { day, month, year, hour, minute, second } (string 2 digit)
}

export const fmtTime = (t) => {
  const p = wibParts(t);
  return `${p.hour}:${p.minute}`;
};
export const fmtDate = (t) => {
  const p = wibParts(t);
  return `${p.day}/${p.month}/${p.year}`;
};
export const fmtDateTime = (t) => `${fmtDate(t)} ${fmtTime(t)}`;
export const fmtDayShort = (t) =>
  new Date(t).toLocaleDateString("id-ID", { timeZone: TZ, day: "numeric", month: "short" });

// Awal hari WIB (sebagai Date absolut) untuk tanggal kalender yang dipilih di
// DatePicker (DatePicker memberi Date dengan komponen tanggal lokal browser).
export const wibDayStart = (pickerDate) =>
  new Date(
    Date.UTC(pickerDate.getFullYear(), pickerDate.getMonth(), pickerDate.getDate()) -
      WIB_OFFSET_MS,
  );

// Kelipatan `step` ms terdekat ke atas, diukur dari tengah malam WIB.
export const ceilWib = (ms, step) =>
  Math.ceil((ms + WIB_OFFSET_MS) / step) * step - WIB_OFFSET_MS;
