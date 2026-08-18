import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, localeCookieName } from "./config";

export default getRequestConfig(async () => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
