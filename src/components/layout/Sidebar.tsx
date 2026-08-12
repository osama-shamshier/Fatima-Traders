"use client";

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
      { name: "POS Terminal", href: "/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "ORGANIZATION",
    items: [
      { name: "Branches", href: "/branches", icon: Building2 },
      { name: "Cash Counters", href: "/counters", icon: Monitor },
    ],
  },
  {
    label: "PRODUCTS & CATALOG",
    items: [
      { name: "Products", href: "/products", icon: Package },
      { name: "Categories", href: "/categories", icon: Tag },
      { name: "Units", href: "/units", icon: Ruler },
    ],
  },
  {
    label: "PARTIES & LEDGERS",
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
    label: "TRANSACTIONS & INVENTORY",
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
    label: "FINANCE & REPORTS",
    items: [
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Profit & Loss", href: "/profit-loss", icon: TrendingUp },
      { name: "Accounting Ledgers", href: "/financials", icon: BarChart3 },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "User Accounts", href: "/users", icon: UserCog },
      { name: "Roles & Permissions", href: "/roles", icon: Shield },
      { name: "Audit Logs", href: "/audit-logs", icon: FileSearch },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Backups", href: "/backups", icon: Database },
    ],
  },
];

export function Sidebar({ userName = "User", userRole = "Owner", isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

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
          <Link href="/dashboard" className="flex items-center gap-2 text-white transition-opacity hover:opacity-80">
            <Store className="h-6 w-6 text-blue-500" />
            <span className="text-base font-bold tracking-tight text-white">Fatima Traders</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-700">
          {navSections.map((section, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
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
                          "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-slate-800 border-l-2 border-blue-500 text-white font-semibold"
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

        {/* User Info & Logout */}
        <div className="mt-auto shrink-0 border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{userName}</span>
              <span className="text-xs text-slate-400">{userRole}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              title="Sign Out of 5 Star Shopping Bag"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
