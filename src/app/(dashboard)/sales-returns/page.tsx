"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils";
import { RotateCcw, Plus, Search, Eye, PackageOpen, CheckCircle2 } from "lucide-react";
import ReturnCreateModal from "@/components/sales-returns/ReturnCreateModal";
import ReturnDetailModal from "@/components/sales-returns/ReturnDetailModal";
import { useTranslations } from "next-intl";

export default function SalesReturnsPage() {
  const t = useTranslations("salesReturns");
  const tc = useTranslations("common");

  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sales-returns");
      if (res.ok) {
        const data = await res.json();
        setReturns(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch sales returns", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.referenceNumber?.toLowerCase().includes(term) ||
      r.buyer?.name?.toLowerCase().includes(term) ||
      r.sale?.invoiceNumber?.toLowerCase().includes(term) ||
      r.refundMethod?.toLowerCase().includes(term) ||
      r.items?.some((i: any) => i.product?.name?.toLowerCase().includes(term))
    );
  });

  const totalRefundsValue = returns.reduce((sum, r) => sum + Number(r.totalRefund || 0), 0);
  const totalItemsReturned = returns.reduce(
    (sum, r) => sum + (r.items?.reduce((iSum: number, item: any) => iSum + Number(item.quantity || 0), 0) || 0),
    0
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm gap-2"
        >
          <Plus className="w-4 h-4" /> {t("processReturn")}
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {t("totalReturns")}
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{returns.length}</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <RotateCcw className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {t("restockedUnits")}
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalItemsReturned.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <PackageOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {t("totalRefundValue")}
            </span>
            <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
              {formatCurrency(totalRefundsValue)}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 ms-1" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 text-xs shadow-none p-0 h-auto"
        />
      </div>

      {/* Returns History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 text-left font-bold">{t("colReturnRef")}</th>
                <th className="p-4 text-left font-bold">{t("colDateTime")}</th>
                <th className="p-4 text-left font-bold">{t("colCustomer")}</th>
                <th className="p-4 text-left font-bold">{t("colInvoiceRef")}</th>
                <th className="p-4 text-left font-bold">{t("colReturnedItems")}</th>
                <th className="p-4 text-center font-bold">{t("colRefundMethod")}</th>
                <th className="p-4 text-right font-bold">{t("colTotalRefund")}</th>
                <th className="p-4 text-right font-bold">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Loading sales returns history...
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">{t("noReturns")}</p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r: any) => {
                  const itemsCount = r.items?.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0) || 0;
                  const firstItem = r.items?.[0];

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-600">
                        {r.referenceNumber || r.id.slice(0, 8)}
                      </td>
                      <td className="p-4 text-slate-600 whitespace-nowrap font-mono">
                        {formatDate(r.returnDate || r.createdAt)}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">
                          {r.buyer?.name || "👤 Walk-in Customer"}
                        </span>
                        {r.buyer?.companyName && (
                          <span className="text-[10px] text-slate-400 block">{r.buyer.companyName}</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 font-mono">
                        {r.sale?.invoiceNumber ? (
                          <span className="text-slate-800 font-semibold">#{r.sale.invoiceNumber}</span>
                        ) : (
                          <span className="text-slate-400 italic">{t("directReturn")}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-slate-900 font-medium block">
                          {firstItem?.product?.name || "Products"}
                          {r.items?.length > 1 ? ` (+${r.items.length - 1} more)` : ""}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {itemsCount} units restocked
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          className={
                            r.refundMethod === "ADJUSTMENT"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : r.refundMethod === "BANK_TRANSFER"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }
                        >
                          {r.refundMethod === "ADJUSTMENT"
                            ? t("adjustedInCredit")
                            : r.refundMethod === "BANK_TRANSFER"
                            ? t("bankTransfer")
                            : t("cashRefund")}
                        </Badge>
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-rose-600 text-sm">
                        {formatCurrency(r.totalRefund)}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReturn(r)}
                          className="h-8 px-2.5 text-xs text-blue-600 hover:bg-blue-50 font-semibold gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 me-1" /> {t("viewDetails")}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Create Modal */}
      <ReturnCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchReturns}
      />

      {/* Return Details Modal */}
      <ReturnDetailModal
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnData={selectedReturn}
      />
    </div>
  );
}
