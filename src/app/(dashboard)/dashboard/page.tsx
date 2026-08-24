"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Building2,
  Users,
  ArrowRight,
  Truck,
  CreditCard,
  RefreshCw,
  Landmark,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LowStockModal } from "@/components/dashboard/LowStockModal";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bank Transfer Details Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // Low Stock Items Modal State
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats", e);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: t("totalProducts"),
      value: `${stats?.totalProducts || 0}`,
      icon: Package,
      color: "bg-blue-600",
      subtext: t("totalProductsSub"),
      clickable: false,
    },
    {
      title: t("todaySalesCount"),
      value: formatCurrency(stats?.salesTodayRevenue || 0),
      icon: ShoppingCart,
      color: "bg-emerald-600",
      subtext: `${stats?.salesTodayCount || 0} ${t("todaySalesCountSub")}`,
      clickable: false,
    },
    {
      title: t("activeBranches"),
      value: `${stats?.activeBranches || 0}`,
      icon: Building2,
      color: "bg-orange-600",
      subtext: t("activeBranchesSub"),
      clickable: false,
    },
    {
      title: t("lowStockAlert"),
      value: `${stats?.lowStockProducts || 0} Items`,
      icon: AlertTriangle,
      color: (stats?.outOfStockCount || 0) > 0 ? "bg-rose-600" : "bg-amber-500",
      subtext: (stats?.lowStockProducts || 0) > 0 
        ? `${stats?.outOfStockCount || 0} ${t("outOfStock")} • ${t("viewLowStockList", { count: stats?.lowStockProducts || 0 })} ➔`
        : t("noLowStock"),
      clickable: true,
      onClick: () => setIsLowStockModalOpen(true),
      highlight: (stats?.lowStockProducts || 0) > 0,
    },
  ];

  const quickActions = [
    {
      name: t("actionPos"),
      sub: t("actionPosSub"),
      href: "/pos",
      icon: ShoppingCart,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      name: t("actionPurchase"),
      sub: t("actionPurchaseSub"),
      href: "/purchases",
      icon: Truck,
      color: "text-blue-600 bg-blue-100",
    },
    {
      name: t("actionProduct"),
      sub: t("actionProductSub"),
      href: "/products",
      icon: Package,
      color: "text-orange-600 bg-orange-100",
    },
    {
      name: t("actionReports"),
      sub: t("actionReportsSub"),
      href: "/reports",
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-2" /> {t("refresh")}
        </Button>
      </div>

      {/* KPI Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              onClick={card.clickable ? card.onClick : undefined}
              className={`rounded-xl border p-4.5 shadow-xs transition-all ${
                card.clickable
                  ? "cursor-pointer hover:shadow-md hover:border-amber-400 bg-white group hover:bg-amber-50/20"
                  : "bg-white"
              } ${card.highlight ? "border-amber-300 bg-amber-50/10" : "border-slate-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color} text-white shadow-2xs`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <span
                  className={`text-xl font-extrabold font-mono ${
                    card.highlight ? "text-rose-700" : "text-slate-900"
                  }`}
                >
                  {isLoading ? "..." : card.value}
                </span>
                <p
                  className={`text-[11px] mt-1 line-clamp-1 font-medium ${
                    card.clickable && (stats?.lowStockProducts || 0) > 0
                      ? "text-amber-700 group-hover:text-amber-900 group-hover:underline"
                      : "text-slate-400"
                  }`}
                >
                  {card.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* TODAY'S SALES PAYMENT BREAKDOWN (CASH, BANK, PENDING CREDIT) */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-600" /> {t("breakdownTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today's Cash */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase">💵 {t("todayCash")}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                {t("todayCashBadge")}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2 font-mono">
              {isLoading ? "..." : formatCurrency(stats?.todayCashSales || 0)}
            </div>
            <p className="text-xs text-emerald-600 mt-1">{t("todayCashSub")}</p>
          </div>

          {/* Today's Bank */}
          <div
            onClick={() => (stats?.todayBankSales || 0) > 0 && setIsBankModalOpen(true)}
            className={`p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-xs transition-all ${
              (stats?.todayBankSales || 0) > 0
                ? "cursor-pointer hover:bg-blue-100/70 hover:shadow-md hover:border-blue-300 group"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-blue-600" /> {t("todayBank")}
              </span>
              {(stats?.todayBankSales || 0) > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {t("clickForDetails")}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-bold">
                  BANK
                </span>
              )}
            </div>
            <div className="text-2xl font-extrabold text-blue-700 mt-2 font-mono">
              {isLoading ? "..." : formatCurrency(stats?.todayBankSales || 0)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {t("todayBankSub", { count: stats?.bankDetailsList?.length || 0 })}
            </p>
          </div>

          {/* Today's Credit */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase">⏳ {t("todayCredit")}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                {t("todayCreditBadge")}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-2 font-mono">
              {isLoading ? "..." : formatCurrency(stats?.todayPendingCredit || 0)}
            </div>
            <p className="text-xs text-amber-600 mt-1">{t("todayCreditSub")}</p>
          </div>
        </div>
      </div>

      {/* Payables & Receivables Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("totalSupplierPayables")}
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-600 font-mono">
              {isLoading ? "..." : formatCurrency(stats?.totalSupplierPayables || 0)}
            </span>
            <Link
              href="/suppliers"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {t("viewSuppliers")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("totalBuyerReceivables")}
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-extrabold font-mono ${
                (stats?.totalBuyerReceivables || 0) < 0 ? "text-emerald-600" : "text-purple-600"
              }`}
            >
              {isLoading ? "..." : formatCurrency(stats?.totalBuyerReceivables || 0)}
            </span>
            <Link
              href="/buyers"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {t("viewDebtors", { count: stats?.outstandingDebtors?.length || 0 })}{" "}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-xs transition-all hover:shadow-md hover:border-blue-500 group"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                    {action.name}
                  </span>
                  <p className="text-xs text-slate-400">{action.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bank Details Modal */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-5 bg-slate-900 text-white flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-400" /> {t("bankModalTitle")}
              </DialogTitle>
              <p className="text-xs text-slate-300">{t("bankModalSub")}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold block">
                {t("totalReceived")}
              </span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                {formatCurrency(stats?.todayBankSales || 0)}
              </span>
            </div>
          </DialogHeader>

          <div className="p-5 overflow-y-auto flex-1 space-y-3">
            {stats?.bankDetailsList?.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">{t("noBankTransfers")}</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">{t("colTime")}</th>
                      <th className="py-2.5 px-3">{t("colSource")}</th>
                      <th className="py-2.5 px-3">{t("colCustomerBranch")}</th>
                      <th className="py-2.5 px-3">{t("colBankWallet")}</th>
                      <th className="py-2.5 px-3">{t("colRefNumber")}</th>
                      <th className="py-2.5 px-3 text-right">{t("colAmount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats?.bankDetailsList?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-500">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.type === "POS_SALE"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.type === "POS_SALE" ? t("badgePosSale") : t("badgeDebtCollection")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.customerName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.branchName} • {item.invoiceNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{item.bankName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.referenceNumber}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold font-mono text-emerald-700 text-sm">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Low & Out of Stock Items Modal */}
      <LowStockModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        items={stats?.lowStockList || []}
      />
    </div>
  );
}
