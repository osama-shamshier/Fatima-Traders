"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableLoader } from "@/components/ui/loader";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, X, CreditCard, DollarSign, Calendar, Filter } from "lucide-react";
import { BuyerPaymentFormModal } from "@/components/buyer-payments/BuyerPaymentFormModal";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getCombinedBuyerPayments } from "@/lib/offline/cacheService";
import { putManyInStore } from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/syncEngine";
import { getPakistanPeriodBounds } from "@/lib/dateUtils";

export default function BuyerPaymentsPage() {
  const t = useTranslations("buyerPayments");
  const tc = useTranslations("common");

  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Period / Date Filters
  const [period, setPeriod] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchPayments = async (
    currentPeriod: string = period,
    currentStart: string = startDate,
    currentEnd: string = endDate
  ) => {
    // 1. Instant Cache-First Hydration (< 10ms)
    try {
      const combined = await getCombinedBuyerPayments([]);
      if (Array.isArray(combined) && combined.length > 0) {
        setPayments(combined);
        setIsLoading(false);
      }
    } catch (err) {
      console.warn("Failed to load initial offline buyer payments:", err);
    }

    // 2. Skip network completely if offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsLoading(false);
      return;
    }

    // 3. Online background refresh with active date filters
    try {
      const params = new URLSearchParams();
      if (currentPeriod !== "all") params.append("period", currentPeriod);
      if (currentPeriod === "custom") {
        if (currentStart) params.append("startDate", currentStart);
        if (currentEnd) params.append("endDate", currentEnd);
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/buyer-payments${queryString}`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (currentPeriod === "all") {
          putManyInStore("buyer_payments", list).catch(() => {});
        }
        const combined = await getCombinedBuyerPayments(list);
        setPayments(combined);
        syncEngine.reportNetworkSuccess();
      }
    } catch (error) {
      syncEngine.reportNetworkFailure();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(period, startDate, endDate);

    let wasSyncing = false;
    let wasOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;

    const unsub = syncEngine.subscribe((state) => {
      const syncFinished = wasSyncing && !state.isSyncing;
      const cameOnline = wasOffline && state.isOnline;
      if (syncFinished || cameOnline) {
        fetchPayments(period, startDate, endDate);
      }
      wasSyncing = state.isSyncing;
      wasOffline = !state.isOnline;
    });

    const handleOnline = () => fetchPayments(period, startDate, endDate);
    window.addEventListener("online", handleOnline);
    return () => {
      unsub();
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      fetchPayments(newPeriod, startDate, endDate);
    }
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    fetchPayments("custom", startDate, endDate);
  };

  const getPeriodLabel = (): string => {
    switch (period) {
      case "today":
        return tc("today");
      case "this_week":
        return tc("thisWeek");
      case "this_month":
        return tc("thisMonth");
      case "custom":
        return startDate && endDate ? `${startDate} to ${endDate}` : tc("customRange");
      default:
        return tc("allTime");
    }
  };

  const filteredPayments = payments.filter((p) => {
    // 1. Client-side Date Range matching (ensures offline cache reflects selected filter)
    if (period !== "all") {
      const bounds = getPakistanPeriodBounds(period, startDate, endDate);
      const paymentTime = new Date(p.paymentDate || p.createdAt).getTime();

      if (bounds.start && paymentTime < bounds.start.getTime()) return false;
      if (bounds.end && paymentTime > bounds.end.getTime()) return false;
    }

    // 2. Search Text matching
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.buyer?.name?.toLowerCase().includes(q) ||
      p.buyer?.companyName?.toLowerCase().includes(q) ||
      p.sale?.invoiceNumber?.toLowerCase().includes(q) ||
      p.bankReference?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q);

    // 3. Method matching
    const matchesMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalReceived = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="p-4 md:p-8 pt-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" /> {t("recordPayment")}
        </Button>
      </div>

      {/* Date Filter Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {tc("dateFilter") || "Date Filter"}
            </span>
          </div>

          {/* Quick Date Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: tc("allTime") },
              { id: "today", label: tc("today") },
              { id: "this_week", label: tc("thisWeek") },
              { id: "this_month", label: tc("thisMonth") },
              { id: "custom", label: tc("customRange") },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePeriodChange(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  period === p.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Form */}
        {period === "custom" && (
          <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">{tc("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1 px-2 bg-slate-50 mt-0.5 h-8"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">{tc("endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1 px-2 bg-slate-50 mt-0.5 h-8"
                required
              />
            </div>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8">
              {tc("apply")}
            </Button>
          </form>
        )}
      </div>

      {/* Search Bar & Method Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-7 relative">
          <Search className="absolute start-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 pe-9 text-xs bg-white border-slate-200 shadow-xs h-10 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute end-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Method Filter Pills */}
        <div className="sm:col-span-5 flex gap-1.5 overflow-x-auto justify-start sm:justify-end">
          {[
            { id: "ALL", label: t("allReceipts") },
            { id: "CASH", label: t("cash") },
            { id: "BANK_TRANSFER", label: t("bank") },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setMethodFilter(pill.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                methodFilter === pill.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 font-semibold block">{t("totalCollections")}:</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {filteredPayments.length} {t("allReceipts")} ({getPeriodLabel()})
            </span>
          </div>
          <span className="text-base font-extrabold font-mono text-emerald-600">
            {formatCurrency(totalReceived)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 font-semibold block">{t("totalCount")}:</span>
            <span className="text-[10px] text-slate-400 font-normal">Active Period: {getPeriodLabel()}</span>
          </div>
          <span className="text-base font-extrabold font-mono text-blue-700">
            {filteredPayments.length}
          </span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="h-11 px-4">{t("colDate")}</th>
                <th className="h-11 px-4">{t("colCustomer")}</th>
                <th className="h-11 px-4">{t("colInvoice")}</th>
                <th className="h-11 px-4">{t("colMethod")}</th>
                <th className="h-11 px-4">{t("colBankRef")}</th>
                <th className="h-11 px-4">{t("colNotes")}</th>
                <th className="h-11 px-4 text-right">{t("colAmount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={7} text="Loading customer payments..." />
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {search || methodFilter !== "ALL" || period !== "all"
                      ? "No payment records matching the selected period and filters."
                      : t("noPayments")}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-600 font-mono">
                      {formatDate(p.paymentDate || p.createdAt)}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {p.buyer?.name}
                      {p.buyer?.companyName && (
                        <span className="text-[10px] text-slate-400 font-normal block">{p.buyer.companyName}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold font-mono text-blue-600">
                      {p.sale?.invoiceNumber ? `#${p.sale.invoiceNumber}` : t("generalSettlement")}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-[11px] font-bold">
                        {p.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-xs">{p.bankReference || "-"}</td>
                    <td className="p-4 text-slate-500 truncate max-w-xs">{p.notes || "-"}</td>
                    <td className="p-4 text-right font-extrabold font-mono text-emerald-600 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BuyerPaymentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => fetchPayments(period, startDate, endDate)}
      />
    </div>
  );
}
