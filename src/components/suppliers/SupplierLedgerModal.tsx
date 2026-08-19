"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Truck, Download, Printer } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface SupplierLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  supplierName: string;
}

export function SupplierLedgerModal({ isOpen, onClose, supplierId, supplierName }: SupplierLedgerModalProps) {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchLedger();
    }
  }, [isOpen, supplierId]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setLedger(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch supplier ledger", error);
    } finally {
      setLoading(false);
    }
  };

  const lastEntry = ledger.length > 0 ? ledger[ledger.length - 1] : null;
  const currentPayable = lastEntry ? Number(lastEntry.balance || 0) : 0;

  const totalDebit = ledger.reduce((sum, e) => sum + Number(e.debit || 0), 0);
  const totalCredit = ledger.reduce((sum, e) => sum + Number(e.credit || 0), 0);

  const handleDownloadCSV = () => {
    if (!ledger || ledger.length === 0) {
      alert("No ledger entries to export.");
      return;
    }

    const headers = ["Date", "Type", "Ref / Invoice #", "Description", "Debit (Purchases)", "Credit (Payments)", "Running Balance"];
    const rows = ledger.map((entry) => [
      `"${formatDate(entry.date)}"`,
      `"${entry.type || ""}"`,
      `"${entry.reference || ""}"`,
      `"${(entry.description || "").replace(/"/g, '""')}"`,
      entry.debit || 0,
      entry.credit || 0,
      entry.balance || 0,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Supplier_Ledger_${supplierName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full sm:max-w-6xl max-h-[94vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between print:hidden">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Supplier Financial Ledger — {supplierName}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Chronological history of purchases, disbursements, and running payables.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-semibold uppercase block">Current Payable Balance</span>
              <span className={`text-xl font-extrabold font-mono ${currentPayable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(currentPayable)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={ledger.length === 0}
                className="text-xs font-semibold gap-1.5 border-slate-300 hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" /> Download CSV / Excel
              </Button>

              <Button
                size="sm"
                onClick={handlePrint}
                disabled={ledger.length === 0}
                className="text-xs font-semibold gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF Statement
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div id="supplier-ledger-print-area" className="flex-1 overflow-y-auto mt-4 p-1">
          {/* Printable Letterhead (Visible in Print) */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-wide uppercase">FATIMA TRADERS</h1>
                <p className="text-xs text-slate-600">Chemical & Packing Materials Store</p>
                <p className="text-xs text-slate-600">Purani Ghalla Mandi, Ahmad Pur East | Tel: 0334-7776934</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-900 uppercase">Supplier Account Statement</h2>
                <p className="text-xs text-slate-500 font-mono">Date Generated: {formatDate(new Date())}</p>
                <p className="text-xs font-bold text-slate-800 mt-1">Supplier: {supplierName}</p>
              </div>
            </div>

            {/* Print Summary Bar */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t text-xs">
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block">Total Purchases (Debit):</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(totalDebit)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block">Total Payments (Credit):</span>
                <strong className="text-emerald-700 font-mono">{formatCurrency(totalCredit)}</strong>
              </div>
              <div className="p-2 bg-slate-50 border rounded">
                <span className="text-slate-500 block">Closing Balance Due:</span>
                <strong className="text-rose-700 font-mono">{formatCurrency(currentPayable)}</strong>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="border rounded-xl bg-white shadow-xs overflow-hidden">
            {loading ? (
              <Loader text="Loading supplier ledger..." className="py-12" />
            ) : (
              <table className="w-full text-xs text-left border-collapse table-fixed">
                <thead className="bg-slate-50 sticky top-0 font-semibold border-b text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-28">Date</th>
                    <th className="p-3 w-28">Type</th>
                    <th className="p-3 w-32">Ref / Invoice #</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right w-36">Debit (Bill Added)</th>
                    <th className="p-3 text-right w-36">Credit (Paid)</th>
                    <th className="p-3 text-right w-40">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledger.map((entry, idx) => (
                    <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="p-3">
                        <Badge variant={entry.type === "PURCHASE" ? "outline" : "success"} className="text-[11px] font-bold">
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-600 truncate">{entry.reference || "-"}</td>
                      <td className="p-3 text-slate-700 truncate">{entry.description || "-"}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-sm text-slate-900 whitespace-nowrap">
                        {formatCurrency(entry.balance)}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        No ledger transactions found for this supplier.
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
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Supplier Signature</p>
            </div>
            <div>
              <p className="border-t border-slate-400 pt-1 w-44 text-center font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 border-t pt-3 flex justify-between items-center shrink-0 print:hidden">
          <Button variant="outline" onClick={fetchLedger} size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Ledger
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            #supplier-ledger-print-area, #supplier-ledger-print-area * { visibility: visible; }
            #supplier-ledger-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
