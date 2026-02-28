import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api"; // GUNAKAN INI, JANGAN AXIOS LANGSUNG

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await api.get("/auth/profile");
          setUser(response.data.data || response.data);
        } catch (error) {
          console.error("Failed to load user profile:", error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await api.post("/auth/login", { username, password });
      // Cek struktur data response lo (apakah response.data.data atau response.data)
      const result = response.data?.data || response.data || response;

      localStorage.setItem("token", result.token);
      setToken(result.token);
      setUser(result.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login gagal",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const result = response.data?.data || response.data || response;

      localStorage.setItem("token", result.token);
      setToken(result.token);
      setUser(result.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registrasi gagal",
      };
    }
  };

  const logout = async () => {
    try {
      if (token) await api.post("/auth/logout");
    } catch (e) {
      console.warn("Logout server-side failed, clearing local data...");
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
