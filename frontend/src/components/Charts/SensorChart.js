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
import { extractRows, sensorMeta } from "../../utils/sensors";
import {
  fmtTime,
  fmtDateTime,
  fmtDayShort,
  ceilWib,
  HOUR_MS,
  DAY_MS,
} from "../../utils/time";

// Alat kirim tiap ~5 menit. Jarak antar titik lebih dari ini = celah data
// (alat mati / sinyal putus) dan digambar putus, bukan disambung.
const GAP_MS = { "24h": 10 * 60 * 1000, "7d": 1.5 * DAY_MS, "30d": 1.5 * DAY_MS };
const RANGE_MS = { "24h": DAY_MS, "7d": 7 * DAY_MS, "30d": 30 * DAY_MS };
const TICK_MS = { "24h": 3 * HOUR_MS, "7d": DAY_MS, "30d": 5 * DAY_MS };

const SensorChart = ({ kandangId, sensorType, timeRange }) => {
  const [data, setData] = useState([]);
  const [domain, setDomain] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!kandangId) return;
    const end = Date.now();
    const start = end - (RANGE_MS[timeRange] || DAY_MS);
    try {
      const res = await getKandangHistorical(
        kandangId,
        sensorType,
        new Date(start).toISOString(),
        new Date(end).toISOString(),
        timeRange,
      );
      const points = extractRows(res)
        .map((r) => ({ t: new Date(r.timestamp).getTime(), value: Number(r.value) }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value))
        .sort((a, b) => a.t - b.t);

      // Sisipkan titik null di celah agar garis terputus.
      const gap = GAP_MS[timeRange] || GAP_MS["24h"];
      const withGaps = [];
      points.forEach((p, i) => {
        if (i > 0 && p.t - points[i - 1].t > gap) {
          withGaps.push({ t: points[i - 1].t + 1, value: null });
        }
        withGaps.push(p);
      });

      setDomain([start, end]);
      setData(withGaps);
    } catch (e) {
      console.error("Chart Error:", e);
    } finally {
      setLoading(false);
    }
  }, [kandangId, sensorType, timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isDaily = timeRange === "7d" || timeRange === "30d";
  const { unit } = sensorMeta(sensorType);
  const pointCount = data.filter((d) => d.value !== null).length;

  if (!loading && pointCount === 0) {
    return (
      <div
        style={{
          height: 250,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        Belum ada data dalam rentang ini.
      </div>
    );
  }

  const ticks = [];
  if (domain) {
    const step = TICK_MS[timeRange] || TICK_MS["24h"];
    for (let t = ceilWib(domain[0], step); t <= domain[1]; t += step) ticks.push(t);
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={domain || ["dataMin", "dataMax"]}
          ticks={ticks}
          tickFormatter={(t) => (isDaily ? fmtDayShort(t) : fmtTime(t))}
          tick={{ fontSize: 10 }}
        />
        <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
        <Tooltip
          labelFormatter={(t) =>
            isDaily ? `Rata-rata ${fmtDayShort(t)}` : `${fmtDateTime(t)} WIB`
          }
          formatter={(v) => [`${Number(v).toFixed(2)} ${unit}`, "Nilai"]}
        />
        <Area
          type="linear"
          dataKey="value"
          stroke="#4f46e5"
          fill="#4f46e5"
          fillOpacity={0.1}
          connectNulls={false}
          dot={pointCount <= 300 ? { r: 1.5 } : false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
export default SensorChart;
