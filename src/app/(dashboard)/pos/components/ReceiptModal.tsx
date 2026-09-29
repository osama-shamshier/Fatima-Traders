"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Printer } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
}

function formatPlainNumber(val: number): string {
  return Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
  const { settings } = useSettings();
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const displayPhone = settings.phone || sale.branch?.phone;
  const displayAddress = settings.address || sale.branch?.address;

  // Ensure footer uses the updated phone if it references the old default
  const rawFooter = settings.receiptFooter || "Thank you for shopping with us!\nPlease visit again.";
  const displayFooter = displayPhone
    ? rawFooter.replace(/0334-?7776934/g, displayPhone)
    : rawFooter;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[420px] bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center print:hidden">Sale Complete</DialogTitle>
        </DialogHeader>

        {/* Thermal Receipt Style Print Area */}
        <div id="receipt-print-area" className="p-2 font-mono text-xs space-y-3">
          <div className="text-center space-y-0.5">
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
              {settings.storeName || "FATIMA TRADERS"}
            </h2>
            {settings.receiptHeader && (
              <p className="text-[11px] font-semibold text-slate-700">
                {settings.receiptHeader}
              </p>
            )}
            <p className="text-[11px] text-slate-600">
              {sale.branch?.name ? `${sale.branch.name} - ` : ""}{displayAddress}
            </p>
            {displayPhone && (
              <p className="text-[11px] text-slate-800 font-bold">Tel: {displayPhone}</p>
            )}
          </div>

          <div className="border-t border-b border-dashed py-2 space-y-1 text-slate-800">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-bold">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(sale.saleDate || sale.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.createdBy?.name || (sale as any).cashierName || "Admin"}</span>
            </div>
            {sale.buyer && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{sale.buyer.name}</span>
              </div>
            )}
          </div>

          {/* Items Table with Item, Qty, Price, Disc, Total columns */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-dashed border-slate-400 text-slate-700">
                <th className="text-left font-bold py-1">Item</th>
                <th className="text-center font-bold py-1 px-1">Qty</th>
                <th className="text-right font-bold py-1 px-1">Price</th>
                <th className="text-right font-bold py-1 px-1">Disc</th>
                <th className="text-right font-bold py-1">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-slate-100">
              {sale.items.map((item: any, i: number) => {
                const productName = item.product?.name || item.name || "Product";
                const unitAbbr = item.product?.unit?.abbreviation || "";
                const itemDisc = Number(item.discount || 0);

                return (
                  <tr key={i} className="align-top">
                    <td className="py-1 pr-1 font-semibold text-slate-900 leading-tight">
                      {productName}
                    </td>
                    <td className="text-center py-1 px-1 whitespace-nowrap">
                      {Number(item.quantity)} {unitAbbr}
                    </td>
                    <td className="text-right py-1 px-1 whitespace-nowrap">
                      {formatPlainNumber(Number(item.sellingPrice))}
                    </td>
                    <td className="text-right py-1 px-1 whitespace-nowrap">
                      {itemDisc > 0 ? formatPlainNumber(itemDisc) : "-"}
                    </td>
                    <td className="text-right py-1 font-bold whitespace-nowrap">
                      {formatPlainNumber(Number(item.lineTotal))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Subtotals & Grand Total */}
          <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-slate-800">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between">
                <span>Order Discount:</span>
                <span>-{formatCurrency(Number(sale.discount))}</span>
              </div>
            )}
            {Number(sale.roundOff || 0) !== 0 && (
              <div className="flex justify-between text-xs">
                <span>Round Off:</span>
                <span>
                  {Number(sale.roundOff) > 0
                    ? `+${formatCurrency(Number(sale.roundOff))}`
                    : `-${formatCurrency(Math.abs(Number(sale.roundOff)))}`}
                </span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dashed">
              <span>Grand Total:</span>
              <span className="text-base">{formatCurrency(Number(sale.grandTotal))}</span>
            </div>
          </div>

          <div className="border-t border-dashed pt-2 space-y-1 text-slate-800">
            <div className="flex justify-between">
              <span>Paid ({sale.paymentMethod}):</span>
              <span>{formatCurrency(Number(sale.amountPaid))}</span>
            </div>
            <div className="flex justify-between">
              <span>Change/Due:</span>
              <span>{formatCurrency(Math.abs(Number(sale.amountPaid) - Number(sale.grandTotal)))}</span>
            </div>
          </div>

          <div className="text-center pt-3 text-[11px] text-slate-500 whitespace-pre-line">
            <p>{displayFooter}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 print:hidden">
          <Button variant="outline" onClick={onClose}>
            New Sale
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            #receipt-print-area, #receipt-print-area * { visibility: visible; }
            #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
