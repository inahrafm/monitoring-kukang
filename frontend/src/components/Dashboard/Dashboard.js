import React, { useState, useEffect, useCallback } from "react";
import { useKandang } from "../../context/KandangContext";
import { getLatestReadings, getKandangStatistics } from "../../services/api";
import KandangSelector from "../Kandang/KandangSelector";
import KandangStatus from "../Kandang/KandangStatus";
import SensorCard from "./SensorCard";
import SensorChart from "../Charts/SensorChart";
import AlertPanel from "../Alerts/AlertPanel";
import { motion } from "framer-motion";
import { SENSOR_KEYS, sensorMeta } from "../../utils/sensors";
import { fmtDateTime } from "../../utils/time";
import "./Dashboard.css";

const formatToWIB = (timestamp) =>
  timestamp ? `${fmtDateTime(timestamp)} WIB` : "—";

const Dashboard = () => {
  const {
    selectedKandang,
    kandangList,
    loading: kandangLoading,
    refreshKandang,
  } = useKandang();
  const [readings, setReadings] = useState({});
  const [statistics, setStatistics] = useState({});
  const [timeRange, setTimeRange] = useState("24h");
  const [activeSensor, setActiveSensor] = useState("temperature");

  const fetchData = useCallback(async () => {
    if (!selectedKandang) return;
    try {
      const latestRes = await getLatestReadings();
      const allData = latestRes?.data?.data || latestRes?.data || {};
      setReadings(allData[selectedKandang] || {});

      const statsRes = await getKandangStatistics(selectedKandang, timeRange);
      const statsArr = statsRes?.data?.data || statsRes?.data || [];
      const statsObj = {};
      if (Array.isArray(statsArr)) {
        statsArr.forEach((s) => {
          statsObj[s.sensor_type] = s;
        });
      }
      setStatistics(statsObj);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [selectedKandang, timeRange]);

  useEffect(() => {
    if (selectedKandang) {
      fetchData();
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [selectedKandang, fetchData]);

  if (kandangLoading) return <div className="loading">Menghubungkan...</div>;

  if (!kandangList || kandangList.length === 0) {
    return (
      <div className="no-data">
        <h2>Database Kosong</h2>
        <button onClick={refreshKandang}>Refresh</button>
      </div>
    );
  }

  return (
    <motion.div
      className="dashboard-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Monitoring Kukang</h1>
          <KandangSelector />
          <KandangStatus kandangId={selectedKandang} />
        </div>
      </div>

      {/* Sensor Cards dengan indikator dipilih */}
      <div className="sensors-grid">
        {SENSOR_KEYS.map((s) => (
          <div
            key={s}
            onClick={() => setActiveSensor(s)}
            className={`sensor-card-wrapper ${activeSensor === s ? "active" : ""}`}
          >
            <SensorCard
              type={s}
              data={readings[s]}
              statistics={statistics[s]}
              kandangId={selectedKandang}
            />
            {activeSensor === s && (
              <div className="active-indicator">✓</div>
            )}
          </div>
        ))}
      </div>

      <div className="dashboard-main">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Grafik {sensorMeta(activeSensor).label} ({sensorMeta(activeSensor).unit})</h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="modern-select"
            >
              <option value="24h">24 Jam Terakhir</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
            </select>
          </div>

          <div className="chart-container">
            <SensorChart
              kandangId={selectedKandang}
              sensorType={activeSensor}
              timeRange={timeRange}
            />
          </div>

          <div className="chart-footer">
            <div>Sensor ID: {readings[activeSensor]?.sensor_id || '—'}</div>
            <div>Update: {formatToWIB(readings[activeSensor]?.timestamp)}</div>
          </div>
        </div>

        <div className="alert-section">
          <AlertPanel kandangId={selectedKandang} />
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
