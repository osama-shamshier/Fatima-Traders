"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingCart, TrendingUp, Building2, Plus, Users, Receipt, ArrowRight, Truck, CreditCard, AlertTriangle, RefreshCw, FileText, Landmark, Wallet, DollarSign } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TableLoader } from "@/components/ui/loader";
import { BuyerLedgerModal } from "@/components/buyers/BuyerLedgerModal";

export default function DashboardPage() {
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bank Transfer Details Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // Buyer Ledger Modal State
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

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

  const handleOpenLedger = (buyer: any) => {
    setSelectedBuyer(buyer);
    setIsLedgerOpen(true);
  };

  const statCards = [
    {
      title: "Total Active Products",
      value: `${stats?.totalProducts || 0} Items`,
      icon: Package,
      color: "bg-blue-600",
      subtext: `${stats?.lowStockProducts || 0} items low on stock`,
    },
    {
      title: "Total Sales Today",
      value: formatCurrency(stats?.salesTodayRevenue || 0),
      icon: ShoppingCart,
      color: "bg-emerald-600",
      subtext: `${stats?.salesTodayCount || 0} orders completed today`,
    },
    {
      title: "Total Lifetime Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: TrendingUp,
      color: "bg-purple-600",
      subtext: "System lifetime gross sales",
    },
    {
      title: "Active Operational Branches",
      value: `${stats?.activeBranches || 0} Branches`,
      icon: Building2,
      color: "bg-orange-600",
      subtext: "All branches active",
    },
  ];

  const quickActions = [
    { name: "POS Terminal", href: "/pos", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-100" },
    { name: "New Purchase Bill", href: "/purchases", icon: Truck, color: "text-blue-600 bg-blue-100" },
    { name: "Record Expense", href: "/expenses", icon: Receipt, color: "text-orange-600 bg-orange-100" },
    { name: "Buyer Collections", href: "/buyer-payments", icon: CreditCard, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fatima Traders — Dashboard</h1>
          <p className="text-slate-500 text-sm">Real-time overview of sales, cash & bank collections, customer debt, and operational status.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Dashboard
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{card.title}</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{card.value}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 border-t pt-2">{card.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* TODAY'S SALES PAYMENT BREAKDOWN (CASH, BANK, PENDING CREDIT) */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-600" /> Today's Sales Collection Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today's Cash */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase">💵 Today's Cash Collected</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">CASH</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2 font-mono">
              {formatCurrency(stats?.todayCashSales || 0)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Physical cash collected at counter</p>
          </div>

          {/* Today's Bank Transfer (CLICKABLE FOR DETAILS!) */}
          <div
            onClick={() => setIsBankModalOpen(true)}
            className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1">
                🏦 Today's Bank Transfer Payments
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold group-hover:bg-blue-700">
                Click for Details ➔
              </span>
            </div>
            <div className="text-2xl font-extrabold text-blue-700 mt-2 font-mono">
              {formatCurrency(stats?.todayBankSales || 0)}
            </div>
            <p className="text-[11px] text-blue-600 mt-1 font-medium">
              {stats?.bankDetailsList?.length || 0} bank transfer transaction(s) received today
            </p>
          </div>

          {/* Today's Pending Credit */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase">⏳ Today's Credit / Pending</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">CREDIT</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-2 font-mono">
              {formatCurrency(stats?.todayPendingCredit || 0)}
            </div>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">Unpaid balance on today's orders</p>
          </div>
        </div>
      </div>

      {/* Financial Receivables & Payables Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800 uppercase block">Total Supplier Payables (Pending)</span>
            <span className="text-xl font-bold text-rose-700">{formatCurrency(stats?.totalSupplierPayables || 0)}</span>
          </div>
          <Link href="/suppliers" className="text-xs font-bold text-rose-700 hover:underline flex items-center">
            View Suppliers <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 uppercase block">Total Buyer Receivables (Outstanding)</span>
            <span className="text-xl font-bold text-emerald-700">{formatCurrency(stats?.totalBuyerReceivables || 0)}</span>
          </div>
          <Link href="/buyers?filter=outstanding" className="text-xs font-bold text-emerald-700 hover:underline flex items-center">
            View Debtors List ({stats?.outstandingDebtors?.length || 0}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* Outstanding Debtors List Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-rose-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-sm">Customers with Pending Outstanding Payments</h3>
          </div>
          <Link href="/buyers?filter=outstanding" className="text-xs font-bold text-rose-700 hover:underline flex items-center">
            Manage All Debtors ({stats?.outstandingDebtors?.length || 0}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Company / Firm</th>
                <th className="p-3">Contact Number</th>
                <th className="p-3 text-right">Outstanding Amount (PKR)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={5} text="Loading debtors list..." />
              ) : (stats?.outstandingDebtors || []).length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-emerald-700 font-semibold">🎉 All customer payments are settled! No pending debt.</td></tr>
              ) : (
                (stats?.outstandingDebtors || []).map((debtor: any) => (
                  <tr key={debtor.id} className="hover:bg-rose-50/30">
                    <td className="p-3 font-bold text-slate-900">{debtor.name}</td>
                    <td className="p-3 text-slate-600">{debtor.companyName || "-"}</td>
                    <td className="p-3 text-slate-600 font-mono">{debtor.contactNumber || "-"}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(debtor.totalOutstanding)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLedger(debtor)}
                        className="text-xs bg-slate-50 hover:bg-slate-100"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-blue-600" /> Settle / Ledger
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-base font-bold text-slate-900">Quick Operations & Actions</h2>
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
                  <span className="font-semibold text-slate-800 text-sm">{action.name}</span>
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
                <Landmark className="w-5 h-5 text-blue-600" /> Today's Bank & Digital Wallet Transactions
              </DialogTitle>
              <p className="text-xs text-slate-500">Itemized breakdown of payments received via bank transfer today.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Total Bank Payments</span>
              <span className="text-lg font-extrabold text-blue-700 font-mono">
                {formatCurrency(stats?.todayBankSales || 0)}
              </span>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] py-3">
            <table className="w-full text-xs text-left border rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                <tr>
                  <th className="p-3">Invoice / Ref #</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Payment Method / Bank Info</th>
                  <th className="p-3 text-right">Amount (PKR)</th>
                  <th className="p-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(stats?.bankDetailsList || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No bank transfer transactions recorded today yet.
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
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLedgerOpen && selectedBuyer && (
        <BuyerLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          buyerId={selectedBuyer.id}
          buyerName={selectedBuyer.name}
          onSuccess={fetchStats}
        />
      )}
    </div>
  );
}
