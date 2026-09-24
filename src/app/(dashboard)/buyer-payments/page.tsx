"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableLoader } from "@/components/ui/loader";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, X, CreditCard, DollarSign } from "lucide-react";
import { BuyerPaymentFormModal } from "@/components/buyer-payments/BuyerPaymentFormModal";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getCombinedBuyerPayments } from "@/lib/offline/cacheService";
import { putManyInStore } from "@/lib/offline/db";

export default function BuyerPaymentsPage() {
  const t = useTranslations("buyerPayments");
  const tc = useTranslations("common");

  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const res = await fetch("/api/buyer-payments");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          putManyInStore("buyer_payments", list).catch(() => {});
          const combined = await getCombinedBuyerPayments(list);
          setPayments(combined);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn("Online fetch buyer payments failed, falling back to offline cache:", error);
    }

    try {
      const combined = await getCombinedBuyerPayments([]);
      setPayments(combined);
    } catch (err) {
      console.error("Failed to load offline buyer payments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const handleOnline = () => fetchPayments();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.buyer?.name?.toLowerCase().includes(q) ||
      p.buyer?.companyName?.toLowerCase().includes(q) ||
      p.sale?.invoiceNumber?.toLowerCase().includes(q) ||
      p.bankReference?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q);

    const matchesMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
          <span className="text-slate-500 font-semibold">{t("totalCollections")}:</span>
          <span className="text-base font-extrabold font-mono text-emerald-600">
            {formatCurrency(totalReceived)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">{t("totalCount")}:</span>
          <span className="text-base font-extrabold font-mono text-blue-700">
            {payments.length}
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
                    {search || methodFilter !== "ALL"
                      ? t("noPayments")
                      : t("noPayments")}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-600 font-mono">{formatDate(p.createdAt || p.paymentDate)}</td>
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
        onSuccess={fetchPayments}
      />
    </div>
  );
}
