import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Expires: "0",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    console.log(
      `🚀 API Request: ${config.method.toUpperCase()} ${config.url}`,
      config.params || {},
    );
    return config;
  },
  (error) => Promise.reject(error),
);

// AUTH
export const login = (username, password) =>
  api.post("/auth/login", { username, password });
export const register = (userData) => api.post("/auth/register", userData);
export const logout = () => api.post("/auth/logout");
export const getProfile = () => api.get("/auth/profile");

// KANDANG
export const getKandangSummary = () => api.get("/kandang/summary");
export const getKandangReadings = (
  kandangId,
  sensorType = null,
  limit = 100,
) => {
  let url = `/kandang/${kandangId}/readings`;
  const params = {};
  if (sensorType) params.sensorType = sensorType;
  if (limit) params.limit = limit;
  return api.get(url, { params });
};
export const getKandangStatistics = (kandangId, period = "24h") =>
  api.get(`/kandang/${kandangId}/statistics`, { params: { period } });

// FIX: Pastikan rangeType dikirim sebagai params
export const getKandangHistorical = (id, type, startTime, endTime, rangeType) =>
  api.get(`/kandang/${id}/${type}/range`, {
    params: { startTime, endTime, rangeType },
  });

export const getLatestReadings = () => api.get("/latest");
export const getActiveAlerts = () => api.get("/alerts");
export const resolveAlert = (alertId) => api.put(`/alerts/${alertId}/resolve`);

export default api;
