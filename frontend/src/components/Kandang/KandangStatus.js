import React, { useState, useEffect, useCallback } from "react";
import { getKandangReadings } from "../../services/api";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { fmtTime, fmtDate } from "../../utils/time";
import "./KandangStatus.css";

// Alat kirim tiap ~5 menit; offline bila > 15 menit tanpa data.
const OFFLINE_AFTER_MIN = 15;

const KandangStatus = ({ kandangId }) => {
  const [lastSeen, setLastSeen] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const checkKandangStatus = useCallback(async () => {
    if (!kandangId) return;
    try {
      const response = await getKandangReadings(kandangId, null, 1);
      const readings = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];
      setLastSeen(readings.length > 0 ? new Date(readings[0].timestamp) : null);
      setNow(Date.now());
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  }, [kandangId]);

  useEffect(() => {
    checkKandangStatus();
    const interval = setInterval(checkKandangStatus, 30000);
    return () => clearInterval(interval);
  }, [checkKandangStatus]);

  if (loading) return null;

  const agoMin = lastSeen ? Math.max(0, Math.floor((now - lastSeen) / 60000)) : null;
  const online = agoMin !== null && agoMin <= OFFLINE_AFTER_MIN;
  const isToday = lastSeen && fmtDate(lastSeen) === fmtDate(now);

  return (
    <div className="kandang-status-bar">
      {online ? (
        <div className="status-badge online">
          <FiCheckCircle className="icon" />
          <span>Alat Online</span>
        </div>
      ) : (
        <div className="status-badge offline">
          <FiAlertCircle className="icon" />
          <span>
            Offline{agoMin !== null ? ` (${agoMin} menit tanpa data)` : " (belum ada data)"}
          </span>
        </div>
      )}
      {lastSeen && (
        <span className="last-update-text">
          | Terakhir terima data: {isToday ? "" : `${fmtDate(lastSeen)} `}
          {fmtTime(lastSeen)} WIB
        </span>
      )}
    </div>
  );
};

export default KandangStatus;
