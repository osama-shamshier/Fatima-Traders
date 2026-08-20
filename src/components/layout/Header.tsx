"use client";

import { Menu, ChevronRight, ChevronDown, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
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
  onToggleSidebar: () => void;
  isSidebarCollapsed?: boolean;
}

export function Header({
  title,
  breadcrumbs = [],
  userName = "User",
  branchName = "Main Branch",
  onToggleSidebar,
  isSidebarCollapsed = false,
}: HeaderProps) {
  const t = useTranslations("header");
  const displayBranchName = branchName === "Main Branch" ? t("mainBranch") : branchName;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-2xs sm:px-6">
      {/* Left Area: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Toggle Button for Desktop and Mobile */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
          title={t("toggleSidebar")}
          aria-label={t("toggleSidebar")}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        <div className="hidden flex-col sm:flex">
          {breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1 text-xs text-slate-500">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-slate-900" : ""}>{crumb.label}</span>
                    )}
                    {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                  </React.Fragment>
                );
              })}
            </nav>
          ) : title ? (
            <h1 className="text-base font-bold text-slate-900">{title}</h1>
          ) : null}
        </div>
      </div>

      {/* Right Area: Branch Badge, Language Switcher, Profile with Dropdown */}
      <div className="flex items-center gap-3">
        {/* Branch Badge */}
        <div className="flex items-center">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60 shadow-2xs">
            {displayBranchName}
          </span>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Profile Dropdown */}
        <div className="relative border-s ps-3 border-slate-200" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            aria-expanded={isDropdownOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-2xs">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="hidden text-xs font-bold text-slate-800 sm:block">{userName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute end-0 mt-2 w-48 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 font-medium">Logged in</p>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
