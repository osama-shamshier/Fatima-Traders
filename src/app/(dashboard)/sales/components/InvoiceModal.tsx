"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  loading: boolean;
}

function formatPlainNumber(val: number): string {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceModal({ isOpen, onClose, sale, loading }: InvoiceModalProps) {
  const t = useTranslations("sales");
  const tc = useTranslations("common");

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="print:hidden text-lg font-bold text-slate-900">{t("invoiceTitle")}</DialogTitle>
        </DialogHeader>

        {loading || !sale ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-1/4" />
          </div>
        ) : (
          <div id="invoice-print-area" className="p-6 bg-white space-y-6 text-sm font-sans">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">INVOICE</h1>
                <p className="text-slate-500 font-mono mt-1 font-bold">#{sale.invoiceNumber}</p>
              </div>
              <div className="text-end">
                <h2 className="text-xl font-black text-slate-900 uppercase">FATIMA TRADERS</h2>
                <p className="text-slate-500 text-xs font-semibold">{sale.branch?.name}</p>
                <p className="text-slate-500 text-xs">{sale.branch?.address}</p>
                <p className="text-slate-500 text-xs font-mono">{sale.branch?.phone}</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex justify-between text-xs">
              <div>
                <h3 className="font-bold text-slate-700 uppercase tracking-wider mb-1">{t("billTo")}:</h3>
                {sale.buyer ? (
                  <div className="space-y-0.5">
                    <p className="text-slate-900 font-bold text-sm">{sale.buyer.name}</p>
                    {sale.buyer.companyName && <p className="text-slate-600">{sale.buyer.companyName}</p>}
                    {sale.buyer.address && <p className="text-slate-500">{sale.buyer.address}</p>}
                    {sale.buyer.contactNumber && <p className="text-slate-500 font-mono">{sale.buyer.contactNumber}</p>}
                  </div>
                ) : (
                  <p className="text-slate-600 font-semibold">👤 Walk-in Customer</p>
                )}
              </div>
              <div className="text-end space-y-1">
                <p><span className="text-slate-400 font-medium">{t("invoiceDate")}:</span> <strong className="text-slate-800">{formatDateTime(sale.saleDate || sale.createdAt)}</strong></p>
                <p><span className="text-slate-400 font-medium">{t("cashier")}:</span> <strong className="text-slate-800">{sale.createdBy?.name || "Admin"}</strong></p>
                <p><span className="text-slate-400 font-medium">{t("paymentStatus")}:</span> <strong className="text-emerald-700 uppercase">{sale.paymentStatus}</strong></p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 bg-slate-50">
                  <th className="py-2.5 px-3 font-bold">{t("colItem")}</th>
                  <th className="py-2.5 px-3 font-bold text-center">{t("colQty")}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{t("colPrice")}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{t("colDisc")}</th>
                  <th className="py-2.5 px-3 font-bold text-right">{t("colTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items?.map((item: any) => {
                  const itemDisc = Number(item.discount || 0);

                  return (
                    <tr key={item.id}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{item.product?.name || item.name || `Product ${item.productId.substring(0,6)}`}</p>
                        {item.product?.sku && <span className="text-[10px] text-slate-400 font-mono block">{item.product.sku}</span>}
                      </td>
                      <td className="py-3 px-3 text-center font-bold font-mono">
                        {item.quantity} {item.product?.unit?.abbreviation || ""}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatPlainNumber(item.sellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {itemDisc > 0 ? `-${formatPlainNumber(itemDisc)}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPlainNumber(item.totalPrice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t("grossTotal")}:</span>
                  <span className="font-mono font-bold">Rs. {formatPlainNumber(sale.subtotal || sale.grandTotal)}</span>
                </div>
                {Number(sale.discount) > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>{t("orderDiscount")}:</span>
                    <span className="font-mono">-Rs. {formatPlainNumber(sale.discount)}</span>
                  </div>
                )}
                {sale.roundOff && Number(sale.roundOff) !== 0 && (
                  <div className="flex justify-between text-purple-700 font-semibold">
                    <span>Round-Off (+/-):</span>
                    <span className="font-mono">
                      {Number(sale.roundOff) > 0 ? `+Rs. ${sale.roundOff}` : `-Rs. ${Math.abs(Number(sale.roundOff))}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t pt-2 text-slate-900">
                  <span>{t("netTotal")}:</span>
                  <span className="font-mono font-bold text-blue-600 text-base">{formatCurrency(sale.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700 pt-1">
                  <span>{t("amountPaid")} ({sale.paymentMethod || "CASH"}):</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(sale.amountPaid)}</span>
                </div>
                {Number(sale.outstandingAmount) > 0 && (
                  <div className="flex justify-between text-rose-600 font-black border-t pt-1">
                    <span>{t("remainingCredit")}:</span>
                    <span className="font-mono">{formatCurrency(sale.outstandingAmount)}</span>
                  </div>
                )}
                {Number(sale.amountPaid) > Number(sale.grandTotal) && (
                  <div className="flex justify-between text-emerald-700 font-bold border-t pt-1">
                    <span>{t("changeReturned")}:</span>
                    <span className="font-mono">{formatCurrency(Number(sale.amountPaid) - Number(sale.grandTotal))}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-6 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">Thank you for your business with Fatima Traders!</p>
              <p>For any inquiries, contact: 0334-7776934 | Purani Ghalla Mandi, Ahmad Pur East</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 print:hidden border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            <Printer className="mr-2 h-4 w-4" /> {tc("print")}
          </Button>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            #invoice-print-area, #invoice-print-area * { visibility: visible; }
            #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
