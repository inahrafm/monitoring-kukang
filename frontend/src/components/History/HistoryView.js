import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

        const res = await getKandangHistorical(
          selectedKand,
          "temperature",
          queryStart.toISOString(),
          queryEnd.toISOString(),
        );

        const d = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        const sortedDesc = [...d].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );
        setPreviewData(sortedDesc.slice(0, 10));
      } catch (e) {
        console.error("Gagal memuat pratinjau:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [selectedKand, startD, endD]);

  // Fungsi untuk mengunduh laporan CSV format ethogram
  const download = async () => {
    try {
      const queryStart = new Date(startD);
      queryStart.setHours(0, 0, 0, 0);
      const queryEnd = new Date(endD);
      queryEnd.setHours(23, 59, 59, 999);

      const SENSORS = ["temperature", "humidity", "light", "noise"];

      // Fetch semua 4 sensor sekaligus
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

      // Bangun map: "HH:MM" -> { temperature, humidity, light, noise }
      // Pakai slot 5 menit: ambil nilai terdekat dalam window 5 menit
      const sensorMap = {}; // key: "HH:MM" (WIB, dibulatkan ke 5 menit)

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

          // Bulatkan ke slot 5 menit terdekat
          const minutes = dWib.getMinutes();
          const roundedMin = Math.floor(minutes / 5) * 5;
          const slotHour = String(dWib.getHours()).padStart(2, "0");
          const slotMin = String(roundedMin).padStart(2, "0");
          const slotKey = `${slotHour}:${slotMin}`;

          if (!sensorMap[slotKey]) sensorMap[slotKey] = {};
          // Simpan nilai pertama yang ditemukan per slot (bisa diganti avg jika perlu)
          if (sensorMap[slotKey][sensorKey] === undefined) {
            sensorMap[slotKey][sensorKey] = parseFloat(r.value).toFixed(2);
          }
        });
      });

      // Sesi waktu hardcoded sesuai template
      const SESSIONS = [
        { label: "Waktu bangun (18:00–20:00)", startHour: 18, endHour: 20 },
        { label: "Waktu aktif (00:00–02:00)", startHour: 0, endHour: 2 },
        {
          label: "Waktu sebelum tidur (04:00–06:00)",
          startHour: 4,
          endHour: 6,
        },
      ];

      const HEADER_ROW = `Waktu,Catatan,${SENSORS.join(",")}`;

      // Generate semua slot 5 menit untuk range jam tertentu
      const generateSlots = (startHour, endHour) => {
        const slots = [];
        for (let h = startHour; h <= endHour; h++) {
          const maxMin = h === endHour ? 0 : 55;
          for (let m = 0; m <= maxMin; m += 5) {
            const hh = String(h).padStart(2, "0");
            const mm = String(m).padStart(2, "0");
            slots.push(`${hh}:${mm}`);
          }
        }
        return slots;
      };

      let csvContent = "";

      SESSIONS.forEach((session, idx) => {
        if (idx > 0) csvContent += "\n"; // baris kosong antar sesi
        csvContent += `${session.label}\n`;
        csvContent += `${HEADER_ROW}\n`;

        const slots = generateSlots(session.startHour, session.endHour);
        slots.forEach((slot) => {
          const row = sensorMap[slot] || {};
          const values = SENSORS.map((s) => row[s] ?? "").join(",");
          csvContent += `${slot},,${values}\n`;
        });
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laporan_Kukang_${selectedKand}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
            <FiDownload /> Unduh Laporan CSV
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
                    <th>Nilai</th>
                    <th>Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length > 0 ? (
                    previewData.map((r, i) => (
                      <tr key={i}>
                        <td>
                          {(() => {
                            const dUtc = new Date(r.timestamp);
                            const dWib = new Date(
                              dUtc.getTime() + 7 * 60 * 60 * 1000,
                            );
                            return dWib.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            });
                          })()}
                        </td>
                        <td>
                          <strong>{parseFloat(r.value).toFixed(2)}</strong>
                        </td>
                        <td>{r.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
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
