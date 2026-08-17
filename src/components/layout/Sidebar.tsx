"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
    label: "Main",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "POS Terminal", href: "/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Organization",
    icon: Building2,
    items: [
      { name: "Branches", href: "/branches", icon: Building2 },
      { name: "Cash Counters", href: "/counters", icon: Monitor },
    ],
  },
  {
    label: "Products & Catalog",
    icon: Package,
    items: [
      { name: "Products", href: "/products", icon: Package },
      { name: "Categories", href: "/categories", icon: Tag },
      { name: "Units", href: "/units", icon: Ruler },
    ],
  },
  {
    label: "Parties & Ledgers",
    icon: Users,
    items: [
      { name: "Customers (Buyers)", href: "/buyers", icon: Users },
      { name: "Outstanding Debtors", href: "/buyers?filter=outstanding", icon: AlertTriangle },
      { name: "Customer Due Dates", href: "/buyer-due-dates", icon: Calendar },
      { name: "Buyer Collections", href: "/buyer-payments", icon: CreditCard },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Supplier Disbursements", href: "/supplier-payments", icon: Receipt },
    ],
  },
  {
    label: "Transactions & Inventory",
    icon: ShoppingCart,
    items: [
      { name: "Sales History", href: "/sales", icon: ShoppingCart },
      { name: "Sales Returns", href: "/sales-returns", icon: RotateCcw },
      { name: "Purchases", href: "/purchases", icon: ShoppingBag },
      { name: "Stock Overview", href: "/inventory", icon: Warehouse },
      { name: "Stock Transfers", href: "/stock-transfers", icon: ArrowLeftRight },
      { name: "Stock Adjustments", href: "/inventory?tab=adjustments", icon: ClipboardEdit },
    ],
  },
  {
    label: "Finance & Reports",
    icon: TrendingUp,
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Profit & Loss", href: "/profit-loss", icon: TrendingUp },
      { name: "Accounting Ledgers", href: "/financials", icon: BarChart3 },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { name: "User Accounts", href: "/users", icon: UserCog },
      { name: "Roles & Permissions", href: "/roles", icon: Shield },
      { name: "Audit Logs", href: "/audit-logs", icon: FileSearch },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Backups", href: "/backups", icon: Database },
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
        <span className="flex-1 text-left">{section.label}</span>
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
        <ul className="mt-1 space-y-0.5 pl-4 border-l border-slate-700/50 ml-5">
          {section.items.map((item) => {
            const isActive =
              pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
            const Icon = item.icon;
            return (
              <li key={item.name}>
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
                  {item.name}
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
          "fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
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
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
