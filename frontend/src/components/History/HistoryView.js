import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { useKandang } from "../../context/KandangContext";
import { getKandangHistorical } from "../../services/api";
import {
  SENSORS,
  SENSOR_KEYS,
  ENV_SENSOR_KEYS,
  sensorMeta,
  groupCycles,
  extractRows,
} from "../../utils/sensors";
import {
  wibDayStart,
  wibParts,
  fmtDate,
  fmtTime,
  HOUR_MS,
  DAY_MS,
} from "../../utils/time";
import {
  FiDownload,
  FiFileText,
  FiCalendar,
  FiDatabase,
  FiLayers,
} from "react-icons/fi";
import "./HistoryView.css";

// Ambil data mentah semua sensor untuk rentang [start, end] -> { sensor: rows }
const fetchAll = async (kandangId, keys, start, end) => {
  const results = await Promise.all(
    keys.map((s) =>
      getKandangHistorical(kandangId, s, start.toISOString(), end.toISOString(), "raw"),
    ),
  );
  const bySensor = {};
  results.forEach((res, i) => {
    bySensor[keys[i]] = extractRows(res);
  });
  return bySensor;
};

// Rentang hari WIB dari tanggal DatePicker (awal hari pertama s/d akhir hari terakhir)
const wibRange = (startD, endD) => [
  wibDayStart(startD),
  new Date(wibDayStart(endD).getTime() + DAY_MS - 1),
];

const fmtVal = (v) => (v === undefined ? "" : Number(v).toFixed(2));
const fileDate = (d) => fmtDate(wibDayStart(d)).replace(/\//g, "-");

const HistoryView = () => {
  const { kandangList, selectedKandang: ctxKandang } = useKandang();
  const [selectedKand, setSelectedKand] = useState(ctxKandang || "");

  useEffect(() => {
    if (!selectedKand && kandangList?.length > 0) {
      setSelectedKand(ctxKandang || kandangList[0].kandang_id);
    }
  }, [kandangList, ctxKandang]);

  // State untuk dokter (single date)
  const [doctorDate, setDoctorDate] = useState(new Date());

  // State untuk CSV (range)
  const [csvStartD, setCsvStartD] = useState(new Date());
  const [csvEndD, setCsvEndD] = useState(new Date());

  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pratinjau: 10 siklus terbaru dalam rentang CSV, jam asli terima data (WIB)
  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedKand) return;
      setLoading(true);
      try {
        const [start, end] = wibRange(csvStartD, csvEndD);
        const bySensor = await fetchAll(selectedKand, SENSOR_KEYS, start, end);
        setPreviewData(groupCycles(bySensor).reverse().slice(0, 10));
      } catch (e) {
        console.error("Gagal memuat pratinjau:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [selectedKand, csvStartD, csvEndD]);

  // ── Download Excel untuk Dokter (single date, ethogram) ──────────────────
  // Format lembar pengamatan per slot 5 menit (sengaja dibulatkan): satu slot
  // diisi siklus data pertama yang jam terimanya jatuh di slot itu.
  const downloadDoctor = async () => {
    try {
      const day0 = wibDayStart(doctorDate); // 00:00 WIB tanggal terpilih
      const queryStart = new Date(day0.getTime() + 18 * HOUR_MS);
      const queryEnd = new Date(day0.getTime() + 30 * HOUR_MS); // 06:00 WIB besok

      const bySensor = await fetchAll(selectedKand, ENV_SENSOR_KEYS, queryStart, queryEnd);
      const sensorMap = {};
      groupCycles(bySensor).forEach((row) => {
        const p = wibParts(row.t);
        const slot = `${p.hour}:${String(Math.floor(Number(p.minute) / 5) * 5).padStart(2, "0")}`;
        if (!sensorMap[slot]) sensorMap[slot] = row;
      });

      // Tanggal sesi: 18:00–20:00 = tanggal terpilih; 00:00–02:00 & 04:00–06:00 = besoknya
      const dateStr = fmtDate(day0);
      const nextStr = fmtDate(day0.getTime() + DAY_MS);

      const SESSIONS = [
        { label: "Waktu bangun (18:00–20:00)", startHour: 18, endHour: 20, date: dateStr },
        { label: "Waktu aktif (00:00–02:00)", startHour: 0, endHour: 2, date: nextStr },
        { label: "Waktu sebelum tidur (04:00–06:00)", startHour: 4, endHour: 6, date: nextStr },
      ];

      const generateSlots = (startHour, endHour) => {
        const slots = [];
        for (let h = startHour; h <= endHour; h++) {
          const maxMin = h === endHour ? 0 : 55;
          for (let m = 0; m <= maxMin; m += 5) {
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
          }
        }
        return slots;
      };

      const header = ENV_SENSOR_KEYS.map((k) => {
        const m = sensorMeta(k);
        return `${m.label} (${m.unit})`;
      });
      const TOTAL_COLS = 3 + ENV_SENSOR_KEYS.length; // Tanggal | Waktu | Catatan | sensors...
      const aoa = [];

      const titleRow = Array(TOTAL_COLS).fill("");
      titleRow[0] = "Pengamatan Perilaku Kukang Jawa";
      aoa.push(titleRow);
      aoa.push(Array(TOTAL_COLS).fill(""));

      const metaRow = Array(TOTAL_COLS).fill("");
      metaRow[0] = "Kandang";
      metaRow[1] = selectedKand;
      metaRow[2] = "Tanggal :";
      metaRow[3] = `${dateStr} – ${nextStr}`;
      aoa.push(metaRow);
      const noteRow = Array(TOTAL_COLS).fill("");
      noteRow[0] =
        "Waktu = slot 5 menit (WIB); nilai = data pertama yang diterima dalam slot tersebut.";
      aoa.push(noteRow);
      aoa.push(Array(TOTAL_COLS).fill(""));

      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
      ];

      SESSIONS.forEach((session, idx) => {
        const sessionRowIdx = aoa.length;
        const sessionRow = Array(TOTAL_COLS).fill("");
        sessionRow[0] = session.label;
        aoa.push(sessionRow);
        merges.push({
          s: { r: sessionRowIdx, c: 0 },
          e: { r: sessionRowIdx, c: TOTAL_COLS - 1 },
        });

        aoa.push(["Tanggal", "Waktu", "Catatan", ...header]);

        generateSlots(session.startHour, session.endHour).forEach((slot) => {
          const row = sensorMap[slot] || {};
          aoa.push([
            session.date,
            slot,
            "",
            ...ENV_SENSOR_KEYS.map((s) =>
              row[s] !== undefined ? Number(row[s].toFixed(2)) : "",
            ),
          ]);
        });

        if (idx < SESSIONS.length - 1) {
          aoa.push(Array(TOTAL_COLS).fill(""));
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [
        { wch: 12 }, // Tanggal
        { wch: 10 }, // Waktu
        { wch: 25 }, // Catatan
        ...ENV_SENSOR_KEYS.map(() => ({ wch: 16 })),
      ];
      ws["!merges"] = merges;
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Sensor");

      XLSX.writeFile(wb, `Laporan_Kukang_${selectedKand}_${fileDate(doctorDate)}.xlsx`);
    } catch (error) {
      console.error("Gagal mengunduh laporan:", error);
      alert("Gagal mengunduh laporan. Silakan coba lagi.");
    }
  };

  // ── Download CSV (range, data mentah per siklus) ─────────────────────────
  const downloadCSV = async () => {
    try {
      const [start, end] = wibRange(csvStartD, csvEndD);
      const bySensor = await fetchAll(selectedKand, SENSOR_KEYS, start, end);
      const rows = groupCycles(bySensor);

      const header = [
        "timestamp_utc",
        "tanggal_wib",
        "jam_wib",
        ...SENSORS.map((s) => `${s.key}_${s.unit.replace("°", "")}`),
      ].join(",");
      const lines = rows.map((r) => {
        const p = wibParts(r.t);
        return [
          new Date(r.t).toISOString(),
          fmtDate(r.t),
          `${p.hour}:${p.minute}:${p.second}`,
          ...SENSOR_KEYS.map((k) => fmtVal(r[k])),
        ].join(",");
      });

      const csvContent = [header, ...lines].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Data_Sensor_${selectedKand}_${fileDate(csvStartD)}_${fileDate(csvEndD)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Gagal mengunduh CSV:", error);
      alert("Gagal mengunduh CSV. Silakan coba lagi.");
    }
  };

  return (
    <div className="history-modern-container">
      <div className="history-header-card">
        <h2>
          <FiFileText /> Pusat Laporan Sensor
        </h2>
      </div>

      <div className="history-grid">
        {/* ── Filter Card ── */}
        <div className="filter-card">
          <h3>
            <FiLayers /> Filter Data
          </h3>

          <div className="input-group">
            <label>Pilih Kandang</label>
            <select
              value={selectedKand}
              onChange={(e) => setSelectedKand(e.target.value)}
            >
              {kandangList.map((k) => (
                <option key={k.kandang_id} value={k.kandang_id}>
                  {k.kandang_id}
                </option>
              ))}
            </select>
          </div>

          {/* Dokter: single date */}
          <div className="download-section">
            <h4>
              <FiCalendar /> Laporan Dokter (Excel)
            </h4>
            <div className="input-group">
              <label>Tanggal</label>
              <DatePicker
                selected={doctorDate}
                onChange={(d) => setDoctorDate(d)}
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <button onClick={downloadDoctor} className="btn-download-full">
              <FiDownload /> Unduh Laporan Dokter
            </button>
          </div>

          {/* CSV: range */}
          <div className="download-section" style={{ marginTop: "1rem" }}>
            <h4>
              <FiDatabase /> Data Mentah (CSV)
            </h4>
            <div className="input-group">
              <label>Dari Tanggal</label>
              <DatePicker
                selected={csvStartD}
                onChange={(d) => setCsvStartD(d)}
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <div className="input-group">
              <label>Sampai Tanggal</label>
              <DatePicker
                selected={csvEndD}
                onChange={(d) => setCsvEndD(d)}
                dateFormat="dd/MM/yyyy"
              />
            </div>
            <button onClick={downloadCSV} className="btn-download-full">
              <FiDownload /> Unduh Data CSV
            </button>
          </div>
        </div>

        {/* ── Preview Card ── */}
        <div className="preview-card">
          <h3>Pratinjau Data (Waktu Indonesia Barat)</h3>
          <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.5rem" }}>
            10 siklus terbaru; jam = waktu data diterima server.
          </p>
          {loading ? (
            <div className="loader-mini">Memproses data...</div>
          ) : (
            <div className="table-mini-wrapper">
              <table className="table-mini">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jam (WIB)</th>
                    {SENSORS.map((m) => (
                      <th key={m.key}>
                        {m.label} ({m.unit})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.length > 0 ? (
                    previewData.map((r) => (
                      <tr key={r.t}>
                        <td>{fmtDate(r.t)}</td>
                        <td>{fmtTime(r.t)}</td>
                        {SENSOR_KEYS.map((k) => (
                          <td key={k}>{r[k] !== undefined ? r[k].toFixed(2) : "-"}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2 + SENSORS.length}
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#94a3b8",
                        }}
                      >
                        Data tidak ditemukan untuk rentang waktu ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
