import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'immoguinee-language';

// Get saved language or detect from device
const getInitialLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
  } catch (error) {
    console.warn('Error reading language from storage:', error);
  }

  // Detect device locale - if French use French, otherwise default to English
  const locales = getLocales();
  const deviceLocale = locales[0]?.languageCode || 'en';
  return deviceLocale === 'fr' ? 'fr' : 'en';
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: 'fr', // Default, will be updated
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Initialize language asynchronously
getInitialLanguage().then((lng) => {
  i18n.changeLanguage(lng);
});

// Helper function to change language and persist
export const changeLanguage = async (lng: string): Promise<void> => {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  } catch (error) {
    console.warn('Error saving language to storage:', error);
  }
};

// Helper to get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'fr';
};

// Available languages
export const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default i18n;
