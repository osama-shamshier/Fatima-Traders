"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Truck, Download, Calendar, X, FileText } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useTranslations } from "next-intl";
import { generateLedgerPDF } from "@/lib/pdfExport";
import { getCombinedSupplierLedger } from "@/lib/offline/cacheService";

interface SupplierLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName: string;
}

export function SupplierLedgerModal({ isOpen, onClose, supplierId, supplierName }: SupplierLedgerModalProps) {
  const t = useTranslations("supplierLedger");
  const tc = useTranslations("common");

  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchLedger();
      setStartDate("");
      setEndDate("");
    }
  }, [isOpen, supplierId]);

  useEffect(() => {
    const handleOnline = () => {
      if (isOpen && supplierId) fetchLedger();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isOpen, supplierId]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        const res = await fetch(`/api/suppliers/${supplierId}/ledger`);
        if (res.ok) {
          const data = await res.json();
          const combined = await getCombinedSupplierLedger(supplierId, Array.isArray(data) ? data : []);
          setLedger(combined);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn("Online supplier ledger fetch failed, loading offline:", error);
    }

    try {
      const combined = await getCombinedSupplierLedger(supplierId, []);
      setLedger(combined);
    } catch (err) {
      console.error("Failed to load offline supplier ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  // Date Filtering & Running Balance recalculation
  const { openingBalance, filteredLedger, periodDebit, periodCredit, closingBalance } = useMemo(() => {
    let openBal = 0;
    let entries: any[] = [];

    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;

    ledger.forEach((item) => {
      const itemDate = new Date(item.date);
      if (start && itemDate < start) {
        openBal += (Number(item.debit) || 0) - (Number(item.credit) || 0);
      } else if ((!start || itemDate >= start) && (!end || itemDate <= end)) {
        entries.push(item);
      }
    });

    let running = openBal;
    let pDebit = 0;
    let pCredit = 0;

    const recalculatedEntries = entries.map((item) => {
      const debit = Number(item.debit) || 0;
      const credit = Number(item.credit) || 0;
      pDebit += debit;
      pCredit += credit;
      running += debit - credit;
      return {
        ...item,
        calculatedBalance: running,
      };
    });

    return {
      openingBalance: openBal,
      filteredLedger: recalculatedEntries,
      periodDebit: pDebit,
      periodCredit: pCredit,
      closingBalance: running,
    };
  }, [ledger, startDate, endDate]);

  const handleDownloadPDF = () => {
    if (filteredLedger.length === 0 && openingBalance === 0) {
      alert("No ledger entries to export for selected dates.");
      return;
    }

    generateLedgerPDF({
      partyType: "Supplier",
      partyName: supplierName || "Supplier",
      startDate,
      endDate,
      openingBalance,
      periodDebit,
      periodCredit,
      closingBalance,
      entries: filteredLedger,
    });
  };

  const handleDownloadCSV = () => {
    if (filteredLedger.length === 0 && openingBalance === 0) {
      alert("No ledger entries to export for selected dates.");
      return;
    }

    const headers = ["Date", "Type", "Ref / Invoice #", "Description", "Debit (Purchases)", "Credit (Payments)", "Running Balance"];
    const rows: string[][] = [];

    if (startDate && openingBalance !== 0) {
      rows.push([
        `"${formatDate(startDate)}"`,
        `"OPENING"`,
        `"-"`,
        `"Opening Balance"`,
        "0",
        "0",
        String(openingBalance),
      ]);
    }

    filteredLedger.forEach((entry) => {
      rows.push([
        `"${formatDate(entry.date)}"`,
        `"${entry.type || ""}"`,
        `"${entry.reference || ""}"`,
        `"${(entry.description || "").replace(/"/g, '""')}"`,
        String(entry.debit || 0),
        String(entry.credit || 0),
        String(entry.calculatedBalance || 0),
      ]);
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateTag = startDate ? `${startDate}_to_${endDate || "latest"}` : "all_time";
    link.download = `Supplier_Ledger_${supplierName.replace(/[^a-zA-Z0-9]/g, "_")}_${dateTag}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const setPresetRange = (type: "THIS_MONTH" | "LAST_30" | "ALL") => {
    const now = new Date();
    if (type === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (type === "LAST_30") {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      setStartDate(past30.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full sm:max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="border-b pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <div className="flex-1">
            <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600 shrink-0" /> {t("title")} — {supplierName}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("subtitle", { name: supplierName })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
            <div className="text-start md:text-end">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase block">{t("closingBalance")}</span>
              <span className={`text-base sm:text-xl font-extrabold font-mono ${closingBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(closingBalance)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={filteredLedger.length === 0 && openingBalance === 0}
                className="text-xs font-semibold gap-1 border-slate-300 hover:bg-slate-50 h-8 px-2.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" /> Excel (CSV)
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={filteredLedger.length === 0 && openingBalance === 0}
                className="text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs h-8 px-2.5"
              >
                <FileText className="w-3.5 h-3.5" /> PDF Statement
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Date Filter Controls (Hidden in Print) */}
        <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 mt-2 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date Range:
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 text-xs py-0 px-2 bg-white w-32 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 text-xs py-0 px-2 bg-white w-32 font-medium"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded"
              >
                <X className="w-3 h-3" /> Clear Filter
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPresetRange("THIS_MONTH")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
            >
              This Month
            </button>
            <button
              onClick={() => setPresetRange("LAST_30")}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setPresetRange("ALL")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                !startDate && !endDate
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="supplier-ledger-print-area" className="flex-1 overflow-y-auto mt-2 p-1">
          {/* Printable Letterhead */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-wide uppercase">FATIMA TRADERS</h1>
                <p className="text-xs text-slate-600">Chemical & Packing Materials Store</p>
                <p className="text-xs text-slate-600">Purani Ghalla Mandi, Ahmad Pur East | Tel: 0334-7776934</p>
              </div>
              <div className="text-end">
                <h2 className="text-lg font-bold text-slate-900 uppercase">Supplier Account Statement</h2>
                <p className="text-xs text-slate-500 font-mono">Date Generated: {formatDate(new Date())}</p>
                <p className="text-xs font-bold text-slate-800 mt-1">Vendor: {supplierName}</p>
                <p className="text-[11px] text-blue-700 font-semibold font-mono mt-0.5">
                  Period: {startDate ? formatDate(startDate) : "Beginning"} — {endDate ? formatDate(endDate) : "Today"}
                </p>
              </div>
            </div>

            {/* Print Summary Metrics */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t text-xs">
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("openingBalance")}:</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(openingBalance)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("periodDebit")}:</span>
                <strong className="text-rose-700 font-mono">{formatCurrency(periodDebit)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("periodCredit")}:</span>
                <strong className="text-emerald-700 font-mono">{formatCurrency(periodCredit)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block text-[10px] uppercase">{t("closingBalance")}:</span>
                <strong className="text-rose-700 font-mono font-black">{formatCurrency(closingBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border rounded-xl bg-white shadow-xs overflow-x-auto w-full">
            {loading ? (
              <Loader text="Loading supplier ledger..." className="py-12" />
            ) : (
              <table className="w-full text-xs text-left border-collapse min-w-[680px]">
                <thead className="bg-slate-50 sticky top-0 font-semibold border-b text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-28">{t("colDate")}</th>
                    <th className="p-3 w-24">{t("colType")}</th>
                    <th className="p-3 w-32">{t("colRef")}</th>
                    <th className="p-3 min-w-[120px]">{t("colDescription")}</th>
                    <th className="p-3 text-right w-28">{t("colDebit")}</th>
                    <th className="p-3 text-right w-28">{t("colCredit")}</th>
                    <th className="p-3 text-right w-32">{t("colBalance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Opening Balance Row if date filtered */}
                  {startDate && (
                    <tr className="bg-blue-50/40 font-bold border-b border-blue-100">
                      <td className="p-3 font-mono text-slate-600">{formatDate(startDate)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] uppercase font-black">
                          OPENING
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">-</td>
                      <td className="p-3 text-slate-800">{t("openingBalance")}</td>
                      <td className="p-3 text-right font-mono">-</td>
                      <td className="p-3 text-right font-mono">-</td>
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(openingBalance)}
                      </td>
                    </tr>
                  )}

                  {filteredLedger.map((entry, index) => (
                    <tr key={`${entry.id}-${index}`} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              entry.type === "PURCHASE"
                                ? "outline"
                                : entry.type === "PAYMENT"
                                ? "success"
                                : "warning"
                            }
                            className="text-[11px] font-bold"
                          >
                            {entry.type}
                          </Badge>
                          {entry.isOfflinePending && (
                            <Badge variant="warning" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-800 border-amber-300">
                              ⏳ Offline
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-600 truncate">{entry.reference || "-"}</td>
                      <td className="p-3 text-slate-700 truncate">{entry.description || "-"}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-extrabold text-sm whitespace-nowrap ${
                          entry.calculatedBalance > 0 ? "text-slate-900" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(entry.calculatedBalance)}
                      </td>
                    </tr>
                  ))}

                  {filteredLedger.length === 0 && openingBalance === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        {t("noEntries")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Printable Signature Footers */}
          <div className="hidden print:flex justify-between items-center mt-12 pt-6 border-t text-xs text-slate-600">
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Prepared By</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Vendor Signature</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="mt-4 border-t pt-3 flex justify-between items-center shrink-0 print:hidden">
          <Button variant="outline" onClick={fetchLedger} size="sm">
            <RefreshCw className="w-3.5 h-3.5 me-1" /> {tc("refresh")}
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            {tc("cancel")}
          </Button>
        </DialogFooter>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden;
            }
            #supplier-ledger-print-area, #supplier-ledger-print-area * {
              visibility: visible;
            }
            #supplier-ledger-print-area {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            div[role="dialog"], div[role="dialog"] > div {
              position: static !important;
              transform: none !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
