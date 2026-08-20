"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingCart, TrendingUp, Building2, Users, ArrowRight, Truck, CreditCard, RefreshCw, Landmark, Wallet } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bank Transfer Details Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

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
      subtext: `${stats?.lowStockProducts || 0} ${t("totalProductsSub")}`,
    },
    {
      title: t("todaySalesCount"),
      value: formatCurrency(stats?.salesTodayRevenue || 0),
      icon: ShoppingCart,
      color: "bg-emerald-600",
      subtext: `${stats?.salesTodayCount || 0} ${t("todaySalesCountSub")}`,
    },
    {
      title: t("customerOutstanding"),
      value: formatCurrency(stats?.totalBuyerReceivables || 0),
      icon: CreditCard,
      color: "bg-purple-600",
      subtext: t("customerOutstandingSub"),
    },
    {
      title: t("activeBranches"),
      value: `${stats?.activeBranches || 0}`,
      icon: Building2,
      color: "bg-orange-600",
      subtext: t("activeBranchesSub"),
    },
  ];

  const quickActions = [
    { name: t("actionPos"), sub: t("actionPosSub"), href: "/pos", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-100" },
    { name: t("actionPurchase"), sub: t("actionPurchaseSub"), href: "/purchases", icon: Truck, color: "text-blue-600 bg-blue-100" },
    { name: t("actionProduct"), sub: t("actionProductSub"), href: "/products", icon: Package, color: "text-orange-600 bg-orange-100" },
    { name: t("actionReports"), sub: t("actionReportsSub"), href: "/reports", icon: TrendingUp, color: "text-purple-600 bg-purple-100" },
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

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color} text-white shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">{isLoading ? "..." : card.value}</span>
                <p className="text-xs text-slate-400 mt-1">{card.subtext}</p>
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
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">{t("todayCashBadge")}</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2 font-mono">
              {formatCurrency(stats?.todayCashSales || 0)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">{t("todayCashSub")}</p>
          </div>

          {/* Today's Bank Transfer (CLICKABLE FOR DETAILS!) */}
          <div
            onClick={() => setIsBankModalOpen(true)}
            className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1">
                🏦 {t("todayBank")}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold group-hover:bg-blue-700">
                {t("clickForDetails")}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-blue-700 mt-2 font-mono">
              {formatCurrency(stats?.todayBankSales || 0)}
            </div>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">
              {t("todayBankSub", { count: stats?.bankDetailsList?.length || 0 })}
            </p>
          </div>

          {/* Today's Pending Credit */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase">⏳ {t("todayCredit")}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">{t("todayCreditBadge")}</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-2 font-mono">
              {formatCurrency(stats?.todayPendingCredit || 0)}
            </div>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">{t("todayCreditSub")}</p>
          </div>
        </div>
      </div>

      {/* Financial Receivables & Payables Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800 uppercase block">{t("totalSupplierPayables")}</span>
            <span className="text-xl font-bold text-rose-700">{formatCurrency(stats?.totalSupplierPayables || 0)}</span>
          </div>
          <Link href="/suppliers" className="text-xs font-bold text-rose-700 hover:underline flex items-center">
            {t("viewSuppliers")} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 uppercase block">{t("totalBuyerReceivables")}</span>
            <span className="text-xl font-bold text-emerald-700">{formatCurrency(stats?.totalBuyerReceivables || 0)}</span>
          </div>
          <Link href="/buyers?filter=outstanding" className="text-xs font-bold text-emerald-700 hover:underline flex items-center">
            {t("viewDebtors", { count: stats?.outstandingDebtors?.length || 0 })} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-900">{t("quickActionsTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="group flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 text-sm block">{action.name}</span>
                    <span className="text-[11px] text-slate-400 font-normal">{action.sub}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* BANK TRANSFER PAYMENTS DETAILS MODAL */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-white rounded-2xl p-6">
          <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-600" /> {t("bankModalTitle")}
              </DialogTitle>
              <p className="text-xs text-slate-500">{t("bankModalSub")}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-semibold block uppercase">{t("todayBank")}</span>
              <span className="text-lg font-extrabold text-blue-700 font-mono">
                {formatCurrency(stats?.todayBankSales || 0)}
              </span>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] py-3">
            <table className="w-full text-xs text-left border rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                <tr>
                  <th className="p-3">{t("colReference")}</th>
                  <th className="p-3">{t("colCustomer")}</th>
                  <th className="p-3">{t("colPaymentType")}</th>
                  <th className="p-3 text-right">{t("colAmount")}</th>
                  <th className="p-3 text-right">{t("colTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(stats?.bankDetailsList || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      {t("noBankToday")}
                    </td>
                  </tr>
                ) : (
                  (stats?.bankDetailsList || []).map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-600">{item.invoiceNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{item.customerName}</td>
                      <td className="p-3 text-slate-700">{item.reference || item.paymentMethod}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-700 text-sm">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setIsBankModalOpen(false)} size="sm">
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
