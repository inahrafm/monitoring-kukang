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

const HistoryView = () => {
  const { kandangList, selectedKandang: ctxKandang } = useKandang();
  const [selectedKand, setSelectedKand] = useState(ctxKandang || "");

  // Pastikan selectedKand terisi saat kandangList load
  useEffect(() => {
    if (!selectedKand && kandangList?.length > 0) {
      setSelectedKand(ctxKandang || kandangList[0].kandang_id);
    }
  }, [kandangList, ctxKandang]);

  const [startD, setStartD] = useState(
    new Date(new Date().setHours(0, 0, 0, 0)),
  );
  const [endD, setEndD] = useState(new Date());
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fungsi untuk memuat pratinjau data di tabel
  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedKand) return;
      setLoading(true);
      try {
        const queryStart = new Date(startD);
        queryStart.setHours(0, 0, 0, 0);
        const queryEnd = new Date(endD);
        queryEnd.setHours(23, 59, 59, 999);

        const SENSORS = ["temperature", "humidity", "light", "noise"];
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

        // Merge semua sensor ke sensorMap per slot 5 menit
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

        // Ambil 10 slot terbaru
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
  }, [selectedKand, startD, endD]);

  // Fungsi untuk mengunduh laporan Excel format ethogram
  const download = async () => {
    try {
      const queryStart = new Date(startD);
      queryStart.setHours(0, 0, 0, 0);
      const queryEnd = new Date(endD);
      queryEnd.setHours(23, 59, 59, 999);

      const SENSORS = ["temperature", "humidity", "light", "noise"];

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

      const SESSIONS = [
        { label: "Waktu bangun (18:00–20:00)", startHour: 18, endHour: 20 },
        { label: "Waktu aktif (00:00–02:00)", startHour: 0, endHour: 2 },
        {
          label: "Waktu sebelum tidur (04:00–06:00)",
          startHour: 4,
          endHour: 6,
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

      const TOTAL_COLS = 2 + SENSORS.length;
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
      metaRow[3] = `${startD.toLocaleDateString("id-ID")} – ${endD.toLocaleDateString("id-ID")}`;
      aoa.push(metaRow);
      aoa.push(Array(TOTAL_COLS).fill(""));

      const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } }]; // judul

      SESSIONS.forEach((session, idx) => {
        const sessionRowIdx = aoa.length;
        const sessionRow = Array(TOTAL_COLS).fill("");
        sessionRow[0] = session.label;
        aoa.push(sessionRow);
        merges.push({
          s: { r: sessionRowIdx, c: 0 },
          e: { r: sessionRowIdx, c: TOTAL_COLS - 1 },
        });

        aoa.push(["Waktu", "Catatan", ...SENSORS]);
        generateSlots(session.startHour, session.endHour).forEach((slot) => {
          const row = sensorMap[slot] || {};
          aoa.push([
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
        { wch: 10 },
        { wch: 25 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];

      ws["!merges"] = merges;

      XLSX.utils.book_append_sheet(wb, ws, "Laporan Sensor");
      const fmt = (d) => d.toLocaleDateString("id-ID").replace(/\//g, "-");
      const filename = `Laporan_Kukang_${selectedKand}_${fmt(startD)}_${fmt(endD)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Gagal mengunduh laporan:", error);
      alert("Gagal mengunduh laporan. Silakan coba lagi.");
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
          <div className="input-group">
            <label>Dari Tanggal</label>
            <DatePicker
              selected={startD}
              onChange={(d) => setStartD(d)}
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <div className="input-group">
            <label>Sampai Tanggal</label>
            <DatePicker
              selected={endD}
              onChange={(d) => setEndD(d)}
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <button onClick={download} className="btn-download-full">
            <FiDownload /> Unduh Data
          </button>
        </div>

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
