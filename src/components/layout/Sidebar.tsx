"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Building2,
  Monitor,
  Package,
  Tag,
  Ruler,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Warehouse,
  ArrowLeftRight,
  ClipboardEdit,
  Receipt,
  TrendingUp,
  BarChart3,
  UserCog,
  Shield,
  FileSearch,
  Settings,
  Database,
  Store,
  LogOut,
  X,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userName?: string;
  userRole?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navSections = [
  {
    labelKey: "sections.main",
    icon: LayoutDashboard,
    items: [
      { labelKey: "items.dashboard", href: "/dashboard", icon: LayoutDashboard },
      { labelKey: "items.posTerminal", href: "/pos", icon: ShoppingCart },
    ],
  },
  {
    labelKey: "sections.organization",
    icon: Building2,
    items: [
      { labelKey: "items.branches", href: "/branches", icon: Building2 },
      { labelKey: "items.cashCounters", href: "/counters", icon: Monitor },
    ],
  },
  {
    labelKey: "sections.catalog",
    icon: Package,
    items: [
      { labelKey: "items.products", href: "/products", icon: Package },
      { labelKey: "items.categories", href: "/categories", icon: Tag },
      { labelKey: "items.units", href: "/units", icon: Ruler },
    ],
  },
  {
    labelKey: "sections.parties",
    icon: Users,
    items: [
      { labelKey: "items.customers", href: "/buyers", icon: Users },
      { labelKey: "items.outstandingDebtors", href: "/buyers?filter=outstanding", icon: AlertTriangle },
      { labelKey: "items.customerDueDates", href: "/buyer-due-dates", icon: Calendar },
      { labelKey: "items.buyerCollections", href: "/buyer-payments", icon: CreditCard },
      { labelKey: "items.suppliers", href: "/suppliers", icon: Truck },
      { labelKey: "items.supplierDisbursements", href: "/supplier-payments", icon: Receipt },
    ],
  },
  {
    labelKey: "sections.transactions",
    icon: ShoppingCart,
    items: [
      { labelKey: "items.salesHistory", href: "/sales", icon: ShoppingCart },
      { labelKey: "items.salesReturns", href: "/sales-returns", icon: RotateCcw },
      { labelKey: "items.purchases", href: "/purchases", icon: ShoppingBag },
      { labelKey: "items.stockOverview", href: "/inventory", icon: Warehouse },
      { labelKey: "items.stockTransfers", href: "/stock-transfers", icon: ArrowLeftRight },
      { labelKey: "items.stockAdjustments", href: "/inventory?tab=adjustments", icon: ClipboardEdit },
    ],
  },
  {
    labelKey: "sections.finance",
    icon: TrendingUp,
    items: [
      { labelKey: "items.expenses", href: "/expenses", icon: Receipt },
      { labelKey: "items.profitLoss", href: "/profit-loss", icon: TrendingUp },
      { labelKey: "items.accountingLedgers", href: "/financials", icon: BarChart3 },
      { labelKey: "items.reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    labelKey: "sections.system",
    icon: Settings,
    items: [
      { labelKey: "items.userAccounts", href: "/users", icon: UserCog },
      { labelKey: "items.rolesPermissions", href: "/roles", icon: Shield },
      { labelKey: "items.auditLogs", href: "/audit-logs", icon: FileSearch },
      { labelKey: "items.settings", href: "/settings", icon: Settings },
      { labelKey: "items.backups", href: "/backups", icon: Database },
    ],
  },
];

// Collapsible section component with smooth height animation
function CollapsibleSection({
  section,
  isExpanded,
  onToggle,
  pathname,
}: {
  section: (typeof navSections)[number];
  isExpanded: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(isExpanded ? undefined : 0);
  const SectionIcon = section.icon;
  const t = useTranslations("sidebar");

  const hasActiveChild = section.items.some(
    (item) => pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false)
  );

  useEffect(() => {
    if (isExpanded) {
      const el = contentRef.current;
      if (el) {
        setHeight(el.scrollHeight);
        // After transition, set to auto so dynamically added content works
        const timer = setTimeout(() => setHeight(undefined), 200);
        return () => clearTimeout(timer);
      }
    } else {
      // First set explicit height, then on next frame set to 0 for animation
      const el = contentRef.current;
      if (el) {
        setHeight(el.scrollHeight);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setHeight(0);
          });
        });
      }
    }
  }, [isExpanded]);

  return (
    <div className="mb-1">
      {/* Parent button */}
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold transition-all duration-200",
          hasActiveChild
            ? "bg-slate-800/80 text-white"
            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
        )}
      >
        <SectionIcon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            hasActiveChild ? "text-blue-500" : "text-slate-400"
          )}
        />
        <span className="flex-1 text-start">{t(section.labelKey)}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      {/* Children - animated container */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: height === undefined ? "auto" : height }}
      >
        <ul className="mt-1 space-y-0.5 border-s border-slate-700/50 ps-4 ms-5">
          {section.items.map((item) => {
            const isActive =
              pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
            const Icon = item.icon;
            return (
              <li key={item.labelKey}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-blue-500/10 text-blue-400 font-semibold"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-blue-400" : "text-slate-500"
                    )}
                  />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function Sidebar({ userName = "User", userRole = "Owner", isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("header");

  const isBillCounterManager = userRole === "Bill Counter Manager";
  const isOwner = userRole === "Owner" || userRole === "Admin";

  const allowedHrefs = [
    "/pos",
    "/sales",
    "/sales-returns",
    "/buyers",
    "/buyers?filter=outstanding",
    "/buyer-due-dates",
    "/buyer-payments",
  ];

  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (!isOwner && isBillCounterManager) {
              return allowedHrefs.includes(item.href);
            }
            return true;
          }),
        }))
        .filter((section) => section.items.length > 0),
    [isOwner, isBillCounterManager]
  );

  // Auto-expand the section that contains the active route
  const initialExpanded = useMemo(() => {
    const expanded = new Set<number>();
    visibleSections.forEach((section, idx) => {
      const hasActive = section.items.some(
        (item) => pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false)
      );
      if (hasActive) expanded.add(idx);
    });
    return expanded;
  }, []); // Only compute once on mount

  const [expandedSections, setExpandedSections] = useState<Set<number>>(initialExpanded);

  const toggleSection = useCallback((idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 start-0 z-50 flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 py-4 border-b border-slate-800">
          <Link
            href={!isOwner && isBillCounterManager ? "/pos" : "/dashboard"}
            className="flex items-center gap-2 text-white transition-opacity hover:opacity-80"
          >
            <Store className="h-6 w-6 text-blue-500" />
            <span className="text-base font-bold tracking-tight text-white">Fatima Traders</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-slate-700">
          {visibleSections.map((section, idx) => (
            <CollapsibleSection
              key={idx}
              section={section}
              isExpanded={expandedSections.has(idx)}
              onToggle={() => toggleSection(idx)}
              pathname={pathname}
            />
          ))}
        </div>

        {/* User Info & Logout */}
        <div className="mt-auto shrink-0 border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{userName}</span>
              <span className="text-xs text-slate-400">{userRole}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title={t("signOut")}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
