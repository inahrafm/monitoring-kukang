import React, { useState, useEffect, useCallback } from "react";
import { getActiveAlerts, resolveAlert } from "../../services/api";
import { FiAlertCircle, FiCheckCircle, FiX } from "react-icons/fi";
import "./AlertPanel.css";

const AlertPanel = ({ kandangId }) => {
  // Pastikan inisialisasi awal selalu array kosong
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [kandangFilter, setKandangFilter] = useState("all");

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await getActiveAlerts();
      // Proteksi: Pastikan kita ambil data array dari dalam object response
      // Backend kita kirim { success: true, data: [] }
      const incomingData = response?.data || [];

      if (Array.isArray(incomingData)) {
        let filtered = incomingData;
        if (kandangId) {
          filtered = incomingData.filter((a) => a.kandang_id === kandangId);
        }
        setAlerts(filtered);
      } else {
        setAlerts([]); // Fallback kalau data bukan array
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]); // Fallback kalau API error
    } finally {
      setLoading(false);
    }
  }, [kandangId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  // Fungsi filter yang aman
  const getFilteredAlerts = () => {
    if (!Array.isArray(alerts)) return [];

    return alerts.filter((alert) => {
      if (filter === "active" && alert.is_resolved) return false;
      if (filter === "resolved" && !alert.is_resolved) return false;
      if (kandangFilter !== "all" && alert.kandang_id !== kandangFilter)
        return false;
      return true;
    });
  };

  const getAlertLabel = (type) => {
    const labels = {
      temperature: "Suhu",
      humidity: "Kelembaban",
      light: "Cahaya",
      noise: "Suara",
    };
    return labels[type] || "Sensor";
  };

  const displayAlerts = getFilteredAlerts();
  const uniqueKandang = Array.isArray(alerts)
    ? [...new Set(alerts.map((a) => a.kandang_id))]
    : [];

  if (loading && alerts.length === 0) {
    return <div className="alert-loading">Memuat notifikasi...</div>;
  }

  return (
    <div className="alert-panel">
      <div className="alert-header">
        <h3>
          <FiAlertCircle className="alert-icon" />
          Notifikasi
          {displayAlerts.length > 0 && (
            <span className="alert-count">{displayAlerts.length}</span>
          )}
        </h3>

        <div className="alert-filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Semua</option>
            <option value="active">Aktif</option>
          </select>
        </div>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="no-alerts">
          <FiCheckCircle className="check-icon" />
          <p>Sistem Normal</p>
        </div>
      ) : (
        <div className="alerts-list">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id || Math.random()}
              className={`alert-item ${alert.alert_type}`}
            >
              <div className="alert-content">
                <div className="alert-title">
                  <strong>{getAlertLabel(alert.sensor_type)}</strong>
                  <span> | {alert.kandang_id}</span>
                </div>
                <div className="alert-message">{alert.message}</div>
              </div>
              {!alert.is_resolved && (
                <button
                  className="resolve-btn"
                  onClick={() => handleResolve(alert.id)}
                >
                  <FiX />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
