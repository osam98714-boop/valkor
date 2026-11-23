import React, { createContext, useContext, useEffect, useState } from "react";
export type Language = "ar" | "en";
type LanguageContextType = { language: Language; setLanguage: (value: Language) => void; isArabic: boolean };
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
export function LanguageProvider({ children, defaultLanguage = "ar" }: { children: React.ReactNode; defaultLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try { const value = localStorage.getItem("valkor-language"); return value === "en" ? "en" : value === "ar" ? "ar" : defaultLanguage; } catch { return defaultLanguage; }
  });
  const setLanguage = (value: Language) => setLanguageState(value);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("valkor-language", language); } catch { /* storage may be unavailable */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, isArabic: language === "ar" }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
