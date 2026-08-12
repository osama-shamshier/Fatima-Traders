"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center print:hidden">Sale Complete</DialogTitle>
        </DialogHeader>

        {/* Thermal Receipt Style Print Area */}
        <div id="receipt-print-area" className="p-4 font-mono text-sm space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold uppercase tracking-wide">Fatima Traders</h2>
            <p className="text-xs text-muted-foreground">{sale.branch?.name || "Main Branch"} {sale.branch?.address ? `- ${sale.branch.address}` : ""}</p>
            <p className="text-xs text-muted-foreground font-bold">Tel: 03347776934</p>
          </div>

          <div className="border-t border-b border-dashed py-2 space-y-1">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span>{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(sale.saleDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.createdBy?.name || "Admin"}</span>
            </div>
            {sale.buyer && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{sale.buyer.name}</span>
              </div>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-dashed">
                <th className="text-left font-normal py-1">Item</th>
                <th className="text-right font-normal py-1">Qty</th>
                <th className="text-right font-normal py-1">Price</th>
                <th className="text-right font-normal py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item: any, i: number) => (
                <tr key={i} className="align-top">
                  <td className="py-1">Product {item.productId.substring(0,4)}</td>
                  <td className="text-right py-1">{Number(item.quantity)}</td>
                  <td className="text-right py-1">{formatCurrency(Number(item.sellingPrice))}</td>
                  <td className="text-right py-1">{formatCurrency(Number(item.lineTotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed pt-2 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(Number(sale.discount))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base mt-2">
              <span>Grand Total:</span>
              <span>{formatCurrency(Number(sale.grandTotal))}</span>
            </div>
          </div>

          <div className="border-t border-dashed pt-2 space-y-1">
            <div className="flex justify-between">
              <span>Paid ({sale.paymentMethod}):</span>
              <span>{formatCurrency(Number(sale.amountPaid))}</span>
            </div>
            <div className="flex justify-between">
              <span>Change/Due:</span>
              <span>{formatCurrency(Math.abs(Number(sale.amountPaid) - Number(sale.grandTotal)))}</span>
            </div>
          </div>

          <div className="text-center pt-4 text-xs">
            <p>Thank you for your purchase!</p>
            <p>Please come again.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 print:hidden">
          <Button variant="outline" onClick={onClose}>
            New Sale
          </Button>
          <Button onClick={handlePrint}>
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
