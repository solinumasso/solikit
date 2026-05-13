import { ui, stubs, DEFAULT_LOCALE, LOCALES, type Locale, type TranslationKey } from './ui';

/**
 * Returns a typed `t()` function for the given locale.
 * Stub languages (wo, bm, zgh): stub overrides are used first,
 * then French, then Catalan default.
 */
export function useTranslations(lang: Locale) {
  const isStub = lang in stubs;
  const stubDict = isStub ? (stubs[lang] as Record<string, string> ?? {}) : {};
  const base = ui[isStub ? 'fr' : lang] as Record<string, string>;
  const fallback = ui[DEFAULT_LOCALE] as Record<string, string>;

  return function t(key: TranslationKey): string {
    return stubDict[key] ?? base[key] ?? fallback[key] ?? key;
  };
}

/** Returns the notice message for stub languages, empty string otherwise. */
export function getNotice(lang: Locale): string {
  return (stubs[lang] as Record<string, string> | undefined)?.notice ?? '';
}

/** Returns the text direction for a given locale. */
export function getDir(lang: Locale): 'ltr' | 'rtl' {
  return LOCALES[lang].dir;
}

/** Detect locale from a URL pathname (e.g. /fr/ → 'fr', / → 'ca'). */
export function getLangFromUrl(url: URL, base = ''): Locale {
  const path = url.pathname.replace(base, '');
  const [, segment] = path.split('/');
  if (segment && segment in LOCALES) return segment as Locale;
  return DEFAULT_LOCALE;
}
