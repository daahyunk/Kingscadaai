import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import koCommon from './locales/ko/common.json';
import koOverview from './locales/ko/overview.json';
import koMonitoring from './locales/ko/monitoring.json';
import koAlarms from './locales/ko/alarms.json';
import koChat from './locales/ko/chat.json';

import enCommon from './locales/en/common.json';
import enOverview from './locales/en/overview.json';
import enMonitoring from './locales/en/monitoring.json';
import enAlarms from './locales/en/alarms.json';
import enChat from './locales/en/chat.json';

import zhCommon from './locales/zh/common.json';
import zhOverview from './locales/zh/overview.json';
import zhMonitoring from './locales/zh/monitoring.json';
import zhAlarms from './locales/zh/alarms.json';
import zhChat from './locales/zh/chat.json';

const resources = {
  ko: {
    common: koCommon,
    overview: koOverview,
    monitoring: koMonitoring,
    alarms: koAlarms,
    chat: koChat,
  },
  en: {
    common: enCommon,
    overview: enOverview,
    monitoring: enMonitoring,
    alarms: enAlarms,
    chat: enChat,
  },
  zh: {
    common: zhCommon,
    overview: zhOverview,
    monitoring: zhMonitoring,
    alarms: zhAlarms,
    chat: zhChat,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
