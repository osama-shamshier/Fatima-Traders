import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { type Locale } from "@/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fatima Traders - Retail Management System",
  description: "Multi-branch retail store management system for Fatima Traders",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  return (
    <html lang={locale} dir="ltr">
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
