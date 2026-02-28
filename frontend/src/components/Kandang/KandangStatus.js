import React, { useState, useEffect } from "react";
import { getKandangReadings } from "../../services/api";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import "./KandangStatus.css";

const KandangStatus = ({ kandangId }) => {
  const [status, setStatus] = useState({
    online: false,
    lastSeen: null,
    lastSeenAgo: 0,
  });
  const [loading, setLoading] = useState(true);

  const checkKandangStatus = async () => {
    if (!kandangId) return;
    try {
      const response = await getKandangReadings(kandangId, null, 1);
      const readings = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];

      if (readings.length > 0) {
        const lastTimestamp = new Date(readings[0].timestamp);
        const now = new Date();

        // Hitung selisih dalam menit
        let diffMinutes = Math.floor((now - lastTimestamp) / 60000);

        // FIX TIMEZONE: Jika selisih sekitar 420 menit (7 jam),
        // itu artinya data UTC vs lokal WIB. Kita normalisasi.
        if (diffMinutes >= 415 && diffMinutes <= 425) {
          diffMinutes = diffMinutes - 420;
        }

        // Jika selisih kurang dari 10 menit setelah normalisasi, anggap Online
        setStatus({
          online: Math.abs(diffMinutes) < 10,
          lastSeen: lastTimestamp,
          lastSeenAgo: Math.max(0, diffMinutes),
        });
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkKandangStatus();
    const interval = setInterval(checkKandangStatus, 30000);
    return () => clearInterval(interval);
  }, [kandangId]);

  if (loading) return null;

  return (
    <div className="kandang-status-bar">
      {status.online ? (
        <div className="status-badge online">
          <FiCheckCircle className="icon" />
          <span>Sistem Online</span>
        </div>
      ) : (
        <div className="status-badge offline">
          <FiAlertCircle className="icon" />
          <span>Offline ({status.lastSeenAgo} menit lalu)</span>
        </div>
      )}
      {status.lastSeen && (
        <span className="last-update-text">
          | Update Terakhir: {status.lastSeen.toLocaleTimeString("id-ID")}
        </span>
      )}
    </div>
  );
};

// Pastikan export default ini ada dan namanya sama dengan const di atas!
export default KandangStatus;
