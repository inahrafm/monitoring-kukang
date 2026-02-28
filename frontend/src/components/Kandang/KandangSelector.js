import React from "react";
import { useKandang } from "../../context/KandangContext";
import "./KandangSelector.css";

const KandangSelector = () => {
  const { kandangList, selectedKandang, setSelectedKandang, loading } =
    useKandang();

  // Proteksi: Jika sedang loading atau kandangList bukan array/kosong, jangan render apa-apa
  if (loading) return <div className="selector-loading">Memuat...</div>;

  if (!kandangList || !Array.isArray(kandangList) || kandangList.length === 0) {
    return <div className="no-kandang-msg">Kandang tidak ditemukan</div>;
  }

  return (
    <div className="kandang-selector-container">
      <label htmlFor="kandang-select">Pilih Kandang:</label>
      <select
        id="kandang-select"
        value={selectedKandang || ""}
        onChange={(e) => setSelectedKandang(e.target.value)}
        className="kandang-select"
      >
        {kandangList.map((k) => (
          <option key={k.kandang_id} value={k.kandang_id}>
            {k.kandang_id} ({k.active_sensors || 0} Sensor)
          </option>
        ))}
      </select>
    </div>
  );
};

export default KandangSelector;
