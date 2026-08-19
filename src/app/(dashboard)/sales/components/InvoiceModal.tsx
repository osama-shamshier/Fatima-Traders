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

export function InvoiceModal({ isOpen, onClose, sale, loading }: InvoiceModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
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
          <div id="invoice-print-area" className="p-6 bg-white space-y-6 text-sm">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                <p className="text-gray-500 mt-1">{sale.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-900">{sale.branch?.name}</h2>
                <p className="text-gray-500">{sale.branch?.address}</p>
                <p className="text-gray-500">{sale.branch?.phone}</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Bill To:</h3>
                {sale.buyer ? (
                  <>
                    <p className="text-gray-800">{sale.buyer.name}</p>
                    <p className="text-gray-500">{sale.buyer.address}</p>
                    <p className="text-gray-500">{sale.buyer.contactNumber}</p>
                  </>
                ) : (
                  <p className="text-gray-500">Walk-in Customer</p>
                )}
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Invoice Date:</span> {formatDate(sale.saleDate)}</p>
                <p><span className="font-semibold">Cashier:</span> {sale.createdBy?.name}</p>
                <p><span className="font-semibold">Status:</span> {sale.paymentStatus}</p>
              </div>
            </div>

            {/* Items */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 font-semibold">Item</th>
                  <th className="py-2 font-semibold text-right">Price</th>
                  <th className="py-2 font-semibold text-right">Qty</th>
                  <th className="py-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3">
                      <p className="font-semibold text-slate-900">{item.product?.name || item.name || `Product ${item.productId.substring(0,6)}`}</p>
                      {Number(item.discount || 0) > 0 && (
                        <p className="text-xs text-rose-600 font-mono">(Item Disc: -{formatCurrency(Number(item.discount))})</p>
                      )}
                    </td>
                    <td className="py-3 text-right">{formatCurrency(Number(item.sellingPrice))}</td>
                    <td className="py-3 text-right">{Number(item.quantity)} {item.product?.unit?.abbreviation || ""}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(Number(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end pt-4">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(Number(sale.subtotal))}</span>
                </div>
                {Number(sale.discount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(Number(sale.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(sale.grandTotal))}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(Number(sale.amountPaid))}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(Number(sale.outstandingAmount))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4 print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} disabled={loading || !sale}>
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            #invoice-print-area, #invoice-print-area * { visibility: visible; }
            #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
            .print\\:hidden { display: none !important; }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}
