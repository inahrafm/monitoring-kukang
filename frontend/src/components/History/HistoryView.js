import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { useKandang } from "../../context/KandangContext";
import { getKandangHistorical } from "../../services/api";
import {
  FiDownload,
  FiFileText,
  FiCalendar,
  FiDatabase,
  FiLayers,
} from "react-icons/fi";
import "./HistoryView.css";

const SENSORS = ["temperature", "humidity", "light", "noise"];

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
  const [csvStartD, setCsvStartD] = useState(
    new Date(new Date().setHours(0, 0, 0, 0)),
  );
  const [csvEndD, setCsvEndD] = useState(new Date());

  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Preview pakai range CSV
  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedKand) return;
      setLoading(true);
      try {
        const queryStart = new Date(csvStartD);
        queryStart.setHours(0, 0, 0, 0);
        const queryEnd = new Date(csvEndD);
        queryEnd.setHours(23, 59, 59, 999);

        const results = await Promise.all(
          SENSORS.map((s) =>
            getKandangHistorical(
              selectedKand,
              s,
              queryStart.toISOString(),
              queryEnd.toISOString(),
            ),
          ),
        );

        const sensorMap = {};
        results.forEach((res, idx) => {
          const sensorKey = SENSORS[idx];
          const d = Array.isArray(res?.data?.data)
            ? res.data.data
            : Array.isArray(res?.data)
              ? res.data
              : [];
          d.forEach((r) => {
            const dWib = new Date(
              new Date(r.timestamp).getTime() + 7 * 60 * 60 * 1000,
            );
            const roundedMin = Math.floor(dWib.getMinutes() / 5) * 5;
            const slotKey = `${String(dWib.getHours()).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;
            if (!sensorMap[slotKey]) sensorMap[slotKey] = { slot: slotKey };
            if (sensorMap[slotKey][sensorKey] === undefined) {
              sensorMap[slotKey][sensorKey] = parseFloat(r.value).toFixed(2);
            }
          });
        });

        const sorted = Object.values(sensorMap)
          .sort((a, b) => b.slot.localeCompare(a.slot))
          .slice(0, 10);
        setPreviewData(sorted);
      } catch (e) {
        console.error("Gagal memuat pratinjau:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [selectedKand, csvStartD, csvEndD]);

  // ── Download Excel untuk Dokter (single date, ethogram) ──────────────────
  const downloadDoctor = async () => {
    try {
      // Ambil data dari jam 18:00 tanggal terpilih s/d 06:00 tanggal berikutnya
      const queryStart = new Date(doctorDate);
      queryStart.setHours(18, 0, 0, 0);
      const queryEnd = new Date(doctorDate);
      queryEnd.setDate(queryEnd.getDate() + 1);
      queryEnd.setHours(6, 0, 0, 0);

      const results = await Promise.all(
        SENSORS.map((s) =>
          getKandangHistorical(
            selectedKand,
            s,
            queryStart.toISOString(),
            queryEnd.toISOString(),
          ),
        ),
      );

      const sensorMap = {};
      results.forEach((res, idx) => {
        const sensorKey = SENSORS[idx];
        const d = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        d.forEach((r) => {
          const dUtc = new Date(r.timestamp);
          const dWib = new Date(dUtc.getTime() + 7 * 60 * 60 * 1000);
          const roundedMin = Math.floor(dWib.getMinutes() / 5) * 5;
          const slotKey = `${String(dWib.getHours()).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;
          if (!sensorMap[slotKey]) sensorMap[slotKey] = {};
          if (sensorMap[slotKey][sensorKey] === undefined) {
            sensorMap[slotKey][sensorKey] = parseFloat(r.value).toFixed(2);
          }
        });
      });

      // Sesi pengamatan
      // Tanggal sesi: 18:00–20:00 = tanggal doctorDate
      //               00:00–02:00 & 04:00–06:00 = doctorDate + 1
      const nextDate = new Date(doctorDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const fmt = (d) => d.toLocaleDateString("id-ID");

      const SESSIONS = [
        {
          label: "Waktu bangun (18:00–20:00)",
          startHour: 18,
          endHour: 20,
          date: doctorDate,
        },
        {
          label: "Waktu aktif (00:00–02:00)",
          startHour: 0,
          endHour: 2,
          date: nextDate,
        },
        {
          label: "Waktu sebelum tidur (04:00–06:00)",
          startHour: 4,
          endHour: 6,
          date: nextDate,
        },
      ];

      const generateSlots = (startHour, endHour) => {
        const slots = [];
        for (let h = startHour; h <= endHour; h++) {
          const maxMin = h === endHour ? 0 : 55;
          for (let m = 0; m <= maxMin; m += 5) {
            slots.push(
              `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
            );
          }
        }
        return slots;
      };

      // +1 kolom Tanggal di depan Waktu
      const TOTAL_COLS = 3 + SENSORS.length; // Tanggal | Waktu | Catatan | sensors...
      const aoa = [];

      // Judul
      const titleRow = Array(TOTAL_COLS).fill("");
      titleRow[0] = "Pengamatan Perilaku Kukang Jawa";
      aoa.push(titleRow);
      aoa.push(Array(TOTAL_COLS).fill(""));

      // Metadata
      const metaRow = Array(TOTAL_COLS).fill("");
      metaRow[0] = "Kandang";
      metaRow[1] = selectedKand;
      metaRow[2] = "Tanggal :";
      metaRow[3] = `${fmt(doctorDate)} – ${fmt(nextDate)}`;
      aoa.push(metaRow);
      aoa.push(Array(TOTAL_COLS).fill(""));

      const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } }];

      SESSIONS.forEach((session, idx) => {
        const sessionRowIdx = aoa.length;
        const sessionRow = Array(TOTAL_COLS).fill("");
        sessionRow[0] = session.label;
        aoa.push(sessionRow);
        merges.push({
          s: { r: sessionRowIdx, c: 0 },
          e: { r: sessionRowIdx, c: TOTAL_COLS - 1 },
        });

        // Header kolom: Tanggal | Waktu | Catatan | sensors
        aoa.push(["Tanggal", "Waktu", "Catatan", ...SENSORS]);

        generateSlots(session.startHour, session.endHour).forEach((slot) => {
          const row = sensorMap[slot] || {};
          aoa.push([
            fmt(session.date),
            slot,
            "",
            ...SENSORS.map((s) => (row[s] !== undefined ? Number(row[s]) : "")),
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
        { wch: 14 }, // temperature
        { wch: 12 }, // humidity
        { wch: 12 }, // light
        { wch: 12 }, // noise
      ];
      ws["!merges"] = merges;
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Sensor");

      const fmtFile = (d) => d.toLocaleDateString("id-ID").replace(/\//g, "-");
      XLSX.writeFile(
        wb,
        `Laporan_Kukang_${selectedKand}_${fmtFile(doctorDate)}.xlsx`,
      );
    } catch (error) {
      console.error("Gagal mengunduh laporan:", error);
      alert("Gagal mengunduh laporan. Silakan coba lagi.");
    }
  };

  // ── Download CSV (range, raw data) ───────────────────────────────────────
  const downloadCSV = async () => {
    try {
      const queryStart = new Date(csvStartD);
      queryStart.setHours(0, 0, 0, 0);
      const queryEnd = new Date(csvEndD);
      queryEnd.setHours(23, 59, 59, 999);

      const results = await Promise.all(
        SENSORS.map((s) =>
          getKandangHistorical(
            selectedKand,
            s,
            queryStart.toISOString(),
            queryEnd.toISOString(),
          ),
        ),
      );

      // Gabungkan semua data per timestamp (slot 5 menit) + simpan tanggal
      const sensorMap = {};
      results.forEach((res, idx) => {
        const sensorKey = SENSORS[idx];
        const d = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        d.forEach((r) => {
          const dWib = new Date(
            new Date(r.timestamp).getTime() + 7 * 60 * 60 * 1000,
          );
          const roundedMin = Math.floor(dWib.getMinutes() / 5) * 5;
          const dateStr = dWib.toLocaleDateString("id-ID");
          const timeStr = `${String(dWib.getHours()).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;
          const slotKey = `${dateStr}_${timeStr}`;

          if (!sensorMap[slotKey]) {
            sensorMap[slotKey] = { date: dateStr, time: timeStr };
          }
          if (sensorMap[slotKey][sensorKey] === undefined) {
            sensorMap[slotKey][sensorKey] = parseFloat(r.value).toFixed(2);
          }
        });
      });

      const sorted = Object.values(sensorMap).sort((a, b) => {
        const ka = `${a.date}_${a.time}`;
        const kb = `${b.date}_${b.time}`;
        return ka.localeCompare(kb);
      });

      // Buat CSV
      const header = ["timestamp", "tanggal", "waktu", ...SENSORS].join(",");
      const rows = sorted.map((r) => {
        const ts = `${r.date} ${r.time}`;
        return [
          ts,
          r.date,
          r.time,
          ...SENSORS.map((s) => (r[s] !== undefined ? r[s] : "")),
        ].join(",");
      });

      const csvContent = [header, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fmtFile = (d) => d.toLocaleDateString("id-ID").replace(/\//g, "-");
      a.download = `Data_Sensor_${selectedKand}_${fmtFile(csvStartD)}_${fmtFile(csvEndD)}.csv`;
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
            <button onClick={downloadCSV} className="btn-download-csv">
              <FiDownload /> Unduh Data CSV
            </button>
          </div>
        </div>

        {/* ── Preview Card ── */}
        <div className="preview-card">
          <h3>Pratinjau Data (Waktu Indonesia Barat)</h3>
          {loading ? (
            <div className="loader-mini">Memproses data...</div>
          ) : (
            <div className="table-mini-wrapper">
              <table className="table-mini">
                <thead>
                  <tr>
                    <th>Jam (WIB)</th>
                    <th>Suhu (°C)</th>
                    <th>Kelembapan (%)</th>
                    <th>Cahaya (Lux)</th>
                    <th>Suara (dB)</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length > 0 ? (
                    previewData.map((r, i) => (
                      <tr key={i}>
                        <td>{r.slot}</td>
                        <td>{r.temperature ?? "-"}</td>
                        <td>{r.humidity ?? "-"}</td>
                        <td>{r.light ?? "-"}</td>
                        <td>{r.noise ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
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
