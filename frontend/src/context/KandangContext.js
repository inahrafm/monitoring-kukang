import React, { createContext, useState, useContext, useEffect } from "react";
import { getKandangSummary } from "../services/api";

const KandangContext = createContext();
export const useKandang = () => useContext(KandangContext);

export const KandangProvider = ({ children }) => {
  const [kandangList, setKandangList] = useState([]);
  const [selectedKandang, setSelectedKandang] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadKandangList = async () => {
    try {
      const response = await getKandangSummary();
      const list = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];
      setKandangList(list);

      // FIX: Jangan reset kalau user sudah milih kandang (selectedKandang sudah ada isinya)
      if (list.length > 0 && !selectedKandang) {
        setSelectedKandang(list[0].kandang_id);
      }
    } catch (error) {
      console.error("Gagal muat list kandang:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKandangList();
    const interval = setInterval(loadKandangList, 15000);
    return () => clearInterval(interval);
  }, [selectedKandang]); // Pantau selectedKandang agar tidak tertimpa

  return (
    <KandangContext.Provider
      value={{
        kandangList,
        selectedKandang,
        setSelectedKandang,
        loading,
        refreshKandang: loadKandangList,
      }}
    >
      {children}
    </KandangContext.Provider>
  );
};
