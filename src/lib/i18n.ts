import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files
import tr from "../../public/locales/tr.json";
import en from "../../public/locales/en.json";

const resources = {
  tr: { translation: tr },
  en: { translation: en },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: "tr", // default language
  fallbackLng: "en",
  debug: process.env.NODE_ENV === "development",

  defaultNS: "translation",
  ns: ["translation"],

  interpolation: {
    escapeValue: false, // React already escapes
  },

  react: {
    useSuspense: false, // good for SSR
  },
});

export default i18n;
