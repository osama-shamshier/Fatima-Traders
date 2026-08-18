"use client";

import { Menu, Bell, ChevronRight, Store, LogOut } from "lucide-react";
import Link from "next/link";
import React from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  userName?: string;
  branchName?: string;
  onMenuClick: () => void;
}

export function Header({
  title,
  breadcrumbs = [],
  userName = "User",
  branchName = "Main Branch",
  onMenuClick,
}: HeaderProps) {
  const t = useTranslations("header");
  const displayBranchName = branchName === "Main Branch" ? t("mainBranch") : branchName;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          title={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden flex-col sm:flex">
          {breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1 text-sm text-slate-500">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-medium text-slate-900" : ""}>{crumb.label}</span>
                    )}
                    {!isLast && <ChevronRight className="h-4 w-4" />}
                  </React.Fragment>
                );
              })}
            </nav>
          ) : title ? (
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Brand Display in Top Header */}
        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl shadow-xs">
          <Store className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold tracking-wide uppercase">Fatima Traders</span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            {displayBranchName}
          </span>
        </div>

        <LanguageSwitcher />

        <button
          className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-500"
          title={t("notifications")}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute end-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2 border-s ps-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">{userName}</span>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white transition-all ms-1"
            title={t("signOut")}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
