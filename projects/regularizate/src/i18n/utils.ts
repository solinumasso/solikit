import es from './es.json';
import fr from './fr.json';
import en from './en.json';
import ar from './ar.json';
import pt from './pt.json';
import ca from './ca.json';
import wo from './wo.json';
import bm from './bm.json';

export const SUPPORTED_LANGS = ['es', 'ca', 'fr', 'en', 'ar', 'pt', 'wo', 'bm'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<Lang, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  es: { label: 'ES', flag: '🇪🇸', dir: 'ltr' },
  ca: { label: 'CA', flag: '🏴', dir: 'ltr' },
  fr: { label: 'FR', flag: '🇫🇷', dir: 'ltr' },
  en: { label: 'EN', flag: '🇬🇧', dir: 'ltr' },
  ar: { label: 'AR', flag: '🇲🇦', dir: 'rtl' },
  pt: { label: 'PT', flag: '🇧🇷', dir: 'ltr' },
  wo: { label: 'WO', flag: '🇸🇳', dir: 'ltr' },
  bm: { label: 'BM', flag: '🇲🇱', dir: 'ltr' },
};

const translations: Record<Lang, Record<string, unknown>> = { es, fr, en, ar, pt, ca, wo, bm };

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function getLang(langCode?: string): Lang {
  if (langCode && SUPPORTED_LANGS.includes(langCode as Lang)) {
    return langCode as Lang;
  }
  return 'es';
}

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = translations[lang] as Record<string, unknown>;
  const fallback = translations['es'] as Record<string, unknown>;

  let value = getNestedValue(dict, key) ?? getNestedValue(fallback, key) ?? key;

  if (vars) {
    for (const [varKey, varVal] of Object.entries(vars)) {
      value = value.replace(`{${varKey}}`, String(varVal));
    }
  }

  return value;
}

export function useTranslations(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
}
