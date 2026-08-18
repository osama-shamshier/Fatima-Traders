export const locales = ["en", "ur"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "fatima_traders_locale";

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function getLocaleDirection(locale: Locale) {
  return locale === "ur" ? "rtl" : "ltr";
}
