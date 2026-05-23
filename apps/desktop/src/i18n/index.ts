import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import zhCN from "./locales/zh-CN.json"

const LANGUAGE_STORAGE_KEY = "freelyrss.language"

function getStoredLanguage(): string {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "zh-CN"
  } catch {
    return "zh-CN"
  }
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
  },
  lng: getStoredLanguage(),
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
})

export default i18n
