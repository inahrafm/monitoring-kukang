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
  ); // Mulai jam 00:00
  const [endD, setEndD] = useState(new Date());
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedKand) return;
      setLoading(true);
      try {
        // FIX: Normalisasi rentang waktu agar mencakup seluruh hari yang dipilih
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
        setPreviewData(d.slice(0, 10));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [selectedKand, selectedSens, startD, endD]);

  const download = async () => {
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

    const csv =
      "Waktu,Kandang,Sensor,Nilai,Satuan\n" +
      d
        .map(
          (r) =>
            `${new Date(r.timestamp).toLocaleString("id-ID")},${r.kandang_id},${r.sensor_type},${r.value},${r.unit}`,
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_${selectedKand}_${selectedSens}.csv`;
    a.click();
  };

  return (
    <div className="history-modern-container">
      <div className="history-header-card">
        <h2>
          <FiFileText /> Pusat Laporan Sensor
        </h2>
        <p>Unduh laporan data sensor untuk analisis tesis.</p>
      </div>

      <div className="history-grid">
        <div className="filter-card">
          <h3>
            <FiLayers /> Filter Data
          </h3>
          <div className="input-group">
            <label>Kandang</label>
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
            <label>Sensor</label>
            <select
              value={selectedSens}
              onChange={(e) => setSelectedSens(e.target.value)}
            >
              <option value="temperature">Suhu (°C)</option>
              <option value="humidity">Kelembaban (%)</option>
              <option value="light">Cahaya</option>
              <option value="noise">Suara</option>
            </select>
          </div>
          <div className="input-group">
            <label>Mulai Tanggal</label>
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
            <FiDownload /> Unduh CSV
          </button>
        </div>

        <div className="preview-card">
          <h3>Pratinjau Data Terbaru (WIB)</h3>
          {loading ? (
            <div className="loader-mini">Memuat...</div>
          ) : (
            <div className="table-mini-wrapper">
              <table className="table-mini">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Nilai</th>
                    <th>Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length > 0 ? (
                    previewData.map((r, i) => (
                      <tr key={i}>
                        <td>
                          {new Date(r.timestamp).toLocaleTimeString("id-ID", {
                            hour12: false,
                          })}
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
                        Pilih rentang tanggal untuk melihat data
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
