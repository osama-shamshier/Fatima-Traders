"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { localeCookieName, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("language");
  const nextLocale: Locale = locale === "ur" ? "en" : "ur";

  const switchLanguage = () => {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
      title={t("switchTo")}
      aria-label={t("switchTo")}
    >
      <Languages className="h-4 w-4 text-blue-600" />
      <span>{locale === "ur" ? t("english") : t("urdu")}</span>
    </button>
  );
}
