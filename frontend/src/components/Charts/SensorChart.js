import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getKandangHistorical } from "../../services/api";

const SensorChart = ({ kandangId, sensorType, timeRange }) => {
  const [data, setData] = useState([]);

  const fetchData = useCallback(async () => {
    if (!kandangId) return;
    try {
      const endTime = new Date();
      const startTime = new Date();

      if (timeRange === "7d") startTime.setDate(startTime.getDate() - 7);
      else if (timeRange === "30d") startTime.setDate(startTime.getDate() - 30);
      else startTime.setHours(startTime.getHours() - 24);

      const res = await getKandangHistorical(
        kandangId,
        sensorType,
        startTime.toISOString(),
        endTime.toISOString(),
        timeRange, // Kirim rangeType ke API
      );

      const raw = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];

      const formatted = raw.map((item) => {
        const d = new Date(item.timestamp);
        // Kompensasi WIB manual (+7 jam)
        const wib = new Date(
          d.getTime() + (d.getHours() < 18 ? 7 * 60 * 60 * 1000 : 0),
        );

        let lbl = "";
        // Tampilkan Tanggal jika rentang lama, tampilkan Jam jika harian
        if (timeRange === "7d" || timeRange === "30d") {
          lbl = wib.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          });
        } else {
          lbl = wib.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }

        return { ...item, value: parseFloat(item.value), label: lbl };
      });
      setData(formatted);
    } catch (e) {
      console.error("Chart Error:", e);
    }
  }, [kandangId, sensorType, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          minTickGap={timeRange === "24h" ? 30 : 5}
        />
        <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
        <Tooltip labelFormatter={(v) => `Waktu/Tanggal: ${v}`} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#4f46e5"
          fill="#4f46e5"
          fillOpacity={0.1}
          animationDuration={500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
export default SensorChart;
