"use client";

import { Menu, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

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
  onMenuClick 
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden flex-col sm:flex">
          {breadcrumbs.length > 0 ? (
            <nav className="flex items-center space-x-1 text-sm text-slate-500">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="hover:text-blue-600 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-medium text-slate-900" : ""}>
                        {crumb.label}
                      </span>
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

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {branchName}
          </span>
        </div>

        <button className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-500">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2 border-l pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
