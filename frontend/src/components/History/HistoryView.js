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
  const [selectedSens, setSelectedSens] = useState("temperature");
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
          selectedSens,
          queryStart.toISOString(),
          queryEnd.toISOString(),
        );

        const d = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        // setPreviewData(d.slice(0, 10)); // Ambil 10 data teratas untuk pratinjau
        const sortedDesc = [...d].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );

        // Ambil 10 data TERBARU
        setPreviewData(sortedDesc.slice(0, 10));
      } catch (e) {
        console.error("Gagal memuat pratinjau:", e);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [selectedKand, selectedSens, startD, endD]);

  // Fungsi untuk mengunduh laporan CSV dengan waktu WIB
  const download = async () => {
    try {
      const queryStart = new Date(startD);
      queryStart.setHours(0, 0, 0, 0);
      const queryEnd = new Date(endD);
      queryEnd.setHours(23, 59, 59, 999);

      const res = await getKandangHistorical(
        selectedKand,
        selectedSens,
        queryStart.toISOString(),
        queryEnd.toISOString(),
      );

      const d = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];

      // Header CSV
      let csvContent = "Waktu,Kandang,Sensor,Nilai,Satuan\n";

      // Isi baris CSV dengan format waktu WIB
      d.forEach((r) => {
        const dUtc = new Date(r.timestamp);
        const dWib = new Date(dUtc.getTime() + 7 * 60 * 60 * 1000);

        const waktuWIB = dWib
          .toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "medium",
          })
          .replace(/,/g, ""); // Hapus koma agar kolom CSV tidak berantakan

        csvContent += `${waktuWIB},${r.kandang_id},${r.sensor_type},${r.value},${r.unit}\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Laporan_Kukang_${selectedKand}_${selectedSens}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
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
            <label>Jenis Sensor</label>
            <select
              value={selectedSens}
              onChange={(e) => setSelectedSens(e.target.value)}
            >
              <option value="temperature">Suhu (°C)</option>
              <option value="humidity">Kelembapan (%)</option>
              <option value="light">Cahaya (Lux)</option>
              <option value="noise">Suara (dB)</option>
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
