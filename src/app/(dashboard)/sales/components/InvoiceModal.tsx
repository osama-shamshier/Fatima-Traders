"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="print:hidden">Invoice Details</DialogTitle>
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
              <div className="text-right">
                <h2 className="text-xl font-black text-slate-900 uppercase">FATIMA TRADERS</h2>
                <p className="text-slate-500 text-xs font-semibold">{sale.branch?.name}</p>
                <p className="text-slate-500 text-xs">{sale.branch?.address}</p>
                <p className="text-slate-500 text-xs font-mono">{sale.branch?.phone}</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex justify-between text-xs">
              <div>
                <h3 className="font-bold text-slate-700 uppercase tracking-wider mb-1">Bill To:</h3>
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
              <div className="text-right space-y-1">
                <p><span className="text-slate-400 font-medium">Invoice Date:</span> <strong className="text-slate-800">{formatDate(sale.saleDate)}</strong></p>
                <p><span className="text-slate-400 font-medium">Cashier:</span> <strong className="text-slate-800">{sale.createdBy?.name || "Admin"}</strong></p>
                <p><span className="text-slate-400 font-medium">Payment Status:</span> <strong className="text-emerald-700 uppercase">{sale.paymentStatus}</strong></p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 bg-slate-50">
                  <th className="py-2.5 px-3 font-bold">Item</th>
                  <th className="py-2.5 px-3 font-bold text-center">Qty</th>
                  <th className="py-2.5 px-3 font-bold text-right">Price</th>
                  <th className="py-2.5 px-3 font-bold text-right">Disc</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total</th>
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
                      <td className="py-3 px-3 text-center font-bold">
                        {Number(item.quantity)} {item.product?.unit?.abbreviation || ""}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {formatPlainNumber(Number(item.sellingPrice))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                        {itemDisc > 0 ? formatPlainNumber(itemDisc) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold font-mono text-slate-900 text-sm">
                        {formatPlainNumber(Number(item.lineTotal))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold font-mono">{formatCurrency(Number(sale.subtotal))}</span>
                </div>
                {Number(sale.discount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Order Discount:</span>
                    <span className="font-bold font-mono">-{formatCurrency(Number(sale.discount))}</span>
                  </div>
                )}
                {Number(sale.roundOff || 0) !== 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Round Off:</span>
                    <span className="font-bold font-mono">
                      {Number(sale.roundOff) > 0
                        ? `+${formatCurrency(Number(sale.roundOff))}`
                        : `-${formatCurrency(Math.abs(Number(sale.roundOff)))}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-blue-700 font-mono">{formatCurrency(Number(sale.grandTotal))}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/80">
                  <span>Amount Paid ({sale.paymentMethod}):</span>
                  <span className="font-bold font-mono">{formatCurrency(Number(sale.amountPaid))}</span>
                </div>
                {Number(sale.outstandingAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">{formatCurrency(Number(sale.outstandingAmount))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 print:hidden border-t pt-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
