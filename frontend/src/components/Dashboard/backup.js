import React from "react";
import "./SensorCard.css";
import { FiThermometer, FiDroplet, FiSun, FiVolume2 } from "react-icons/fi";

const SensorCard = ({ type, data, statistics, kandangId }) => {
  const getIcon = () => {
    switch (type) {
      case "temperature":
        return <FiThermometer className="sensor-icon" />;
      case "humidity":
        return <FiDroplet className="sensor-icon" />;
      case "light":
        return <FiSun className="sensor-icon" />;
      case "noise":
        return <FiVolume2 className="sensor-icon" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    const titles = {
      temperature: "Suhu",
      humidity: "Kelembaban",
      light: "Intensitas Cahaya",
      noise: "Tingkat Kebisingan",
    };
    return titles[type] || type;
  };

  const getUnit = () => {
    const units = {
      temperature: "°C",
      humidity: "%",
      light: "Lumen",
      noise: "dB",
    };
    return units[type] || "";
  };

  const getStatus = (value) => {
    const thresholds = {
      temperature: { min: 22, max: 28 },
      humidity: { min: 50, max: 70 },
      light: { min: 50, max: 500 },
      noise: { min: 30, max: 70 },
    };

    const threshold = thresholds[type];
    if (!threshold || value === undefined || value === null) return "normal";

    if (value < threshold.min) return "low";
    if (value > threshold.max) return "high";
    return "normal";
  };

  const status = getStatus(data?.value);
  const unit = getUnit();

  return (
    <div className={`sensor-card ${status}`}>
      <div className="sensor-header">
        {getIcon()}
        <h3>{getTitle()}</h3>
        <span className="kandang-badge">{kandangId}</span>
      </div>

      <div className="sensor-body">
        <div className="sensor-value">
          {data?.value !== undefined && data?.value !== null ? (
            <>
              {data.value} {unit}
            </>
          ) : (
            "-- --"
          )}
        </div>

        {statistics && (
          <div className="sensor-stats">
            <div className="stat-item">
              <span className="stat-label">Rata-rata</span>
              <span className="stat-value">
                {(Number(statistics?.avg_value) || 0).toFixed(2)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Min</span>
              <span className="stat-value">
                {(Number(statistics?.min_value) || 0).toFixed(2)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max</span>
              <span className="stat-value">
                {(Number(statistics?.max_value) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="sensor-time">
          Update:{" "}
          {data?.timestamp
            ? new Date(data.timestamp).toLocaleTimeString()
            : "Belum ada data"}
        </div>
      </div>

      <div className="sensor-footer">
        <span className={`status-badge ${status}`}>
          {status === "normal"
            ? "Normal"
            : status === "low"
              ? "Di Bawah Normal"
              : "Di Atas Normal"}
        </span>
        <span className="sensor-id">
          {data?.sensor_id || "Tidak ada sensor"}
        </span>
      </div>
    </div>
  );
};

export default SensorCard;
