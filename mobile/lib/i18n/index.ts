import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';

const LANGUAGE_KEY = '@immoguinee_language';

// Get stored language or device language
const getStoredLanguage = async (): Promise<string> => {
  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang) {
      return storedLang;
    }
  } catch (error) {
    console.warn('Failed to get stored language:', error);
  }

  // Default to device language, fallback to French
  const deviceLang = Localization.getLocales()[0]?.languageCode || 'fr';
  return deviceLang === 'en' ? 'en' : 'fr';
};

// Save language preference
export const setLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  } catch (error) {
    console.warn('Failed to save language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'fr';
};

// Available languages
export const languages = [
  { code: 'fr', name: 'Français', flag: '🇬🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

// Aliases for backwards compatibility
export const LANGUAGES = languages;
export const changeLanguage = setLanguage;

// Initialize i18n
const initI18n = async () => {
  const lng = await getStoredLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
      },
      lng,
      fallbackLng: 'fr',
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      },
    });
};

// Initialize immediately
initI18n();

export default i18n;
