"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  X
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
    label: "MAIN",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "ORGANIZATION",
    items: [
      { name: "Branches", href: "/branches", icon: Building2 },
      { name: "Cash Counters", href: "/cash-counters", icon: Monitor },
    ]
  },
  {
    label: "PRODUCTS",
    items: [
      { name: "Products", href: "/products", icon: Package },
      { name: "Categories", href: "/categories", icon: Tag },
      { name: "Units", href: "/units", icon: Ruler },
    ]
  },
  {
    label: "TRANSACTIONS",
    items: [
      { name: "POS/Sales", href: "/sales", icon: ShoppingCart },
      { name: "Purchases", href: "/purchases", icon: ShoppingBag },
    ]
  },
  {
    label: "PARTIES",
    items: [
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Buyers", href: "/buyers", icon: Users },
    ]
  },
  {
    label: "INVENTORY",
    items: [
      { name: "Stock", href: "/stock", icon: Warehouse },
      { name: "Transfers", href: "/transfers", icon: ArrowLeftRight },
      { name: "Adjustments", href: "/adjustments", icon: ClipboardEdit },
    ]
  },
  {
    label: "FINANCE",
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Profit/Loss", href: "/profit-loss", icon: TrendingUp },
    ]
  },
  {
    label: "REPORTS",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ]
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Users", href: "/users", icon: UserCog },
      { name: "Roles", href: "/roles", icon: Shield },
      { name: "Audit Logs", href: "/audit-logs", icon: FileSearch },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Backups", href: "/backups", icon: Database },
    ]
  }
];

export function Sidebar({ userName = "User", userRole = "Admin", isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
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
        <div className="flex h-16 shrink-0 items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-white transition-opacity hover:opacity-80">
            <Store className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold tracking-tight">RetailPro</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-700">
          {navSections.map((section, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-800 border-l-2 border-blue-500 text-white"
                            : "hover:bg-slate-800/50 hover:text-white"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive ? "text-blue-500" : "text-slate-400")} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* User Info / Logout */}
        <div className="mt-auto shrink-0 border-t border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{userName}</span>
              <span className="text-xs text-slate-400">{userRole}</span>
            </div>
            <button className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
