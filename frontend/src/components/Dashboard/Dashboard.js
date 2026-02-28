import React, { useState, useEffect, useCallback } from "react";
import { useKandang } from "../../context/KandangContext";
import { getLatestReadings, getKandangStatistics } from "../../services/api";
import KandangSelector from "../Kandang/KandangSelector";
import SensorCard from "./SensorCard";
import SensorChart from "../Charts/SensorChart";
import AlertPanel from "../Alerts/AlertPanel";
import { motion } from "framer-motion";
import { FiActivity } from "react-icons/fi";
import "./Dashboard.css";

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
      // Pake logic backup lo yang terbukti GAK STRIP
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
        </div>
        {/* Tombol refresh dan jam update SUDAH DIHAPUS */}
      </div>

      {/* KandangStatus (Baris Offline) SUDAH DIHAPUS */}

      <div className="sensors-grid">
        {["temperature", "humidity", "light", "noise"].map((s) => (
          <div
            key={s}
            onClick={() => setActiveSensor(s)}
            className={`clickable-card ${activeSensor === s ? "active" : ""}`}
          >
            <SensorCard
              type={s}
              data={readings[s]}
              statistics={statistics[s]}
              kandangId={selectedKandang}
            />
          </div>
        ))}
      </div>

      <div className="dashboard-main">
        <div className="chart-section">
          <div className="chart-header">
            <h3>
              <FiActivity /> Grafik {activeSensor.toUpperCase()}
            </h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="24h">Terakhir 24 Jam (WIB)</option>
              <option value="7d">Terakhir 7 Hari</option>
              <option value="30d">Terakhir 30 Hari</option>
            </select>
          </div>
          <SensorChart
            kandangId={selectedKandang}
            sensorType={activeSensor}
            timeRange={timeRange}
          />
        </div>
        <div className="alert-section">
          <AlertPanel kandangId={selectedKandang} />
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
