import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appTitle: "India's AI",
      searchHistory: "Search History",
      selectLanguage: "Select Language",
      inputPlaceholder: "Type your message here...",
      send: "Send",
      sending: "Sending...",
      response: "Response",
      loading: "Loading response...",
    },
  },
  hi: {
    translation: {
      appTitle: "भारत की एआई",
      searchHistory: "खोज इतिहास",
      selectLanguage: "भाषा चुनें",
      inputPlaceholder: "अपना संदेश यहाँ टाइप करें...",
      send: "भेजें",
      sending: "भेजा जा रहा है...",
      response: "उत्तर",
      loading: "उत्तर लोड हो रहा है...",
    },
  },
  mr: {
    translation: {
      appTitle: "भारताचे एआय",
      searchHistory: "शोध इतिहास",
      selectLanguage: "भाषा निवडा",
      inputPlaceholder: "आपला संदेश येथे टाइप करा...",
      send: "पाठवा",
      sending: "पाठवले जात आहे...",
      response: "प्रतिसाद",
      loading: "प्रतिसाद लोड केला जात आहे...",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
