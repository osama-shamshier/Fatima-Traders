"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RotateCcw, Building2, User, Receipt, Calendar, CreditCard } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  returnData: any | null;
}

export default function ReturnDetailModal({ isOpen, onClose, returnData }: Props) {
  if (!returnData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Sales Return #{returnData.referenceNumber || returnData.id.slice(0, 8)}
              </DialogTitle>
            </div>
            <Badge
              className={
                returnData.refundMethod === "ADJUSTMENT"
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : returnData.refundMethod === "BANK_TRANSFER"
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }
            >
              {returnData.refundMethod === "ADJUSTMENT"
                ? "📉 Adjusted in Credit"
                : returnData.refundMethod === "BANK_TRANSFER"
                ? "🏦 Bank Transfer"
                : "💵 Cash Refund"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Return Date:</span>
              <span className="font-bold text-slate-800">{formatDate(returnData.returnDate || returnData.createdAt)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Customer:</span>
              <span className="font-bold text-slate-800">{returnData.buyer?.name || "Walk-in Customer"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Branch:</span>
              <span className="font-bold text-slate-800">{returnData.branch?.name || "Main Branch"}</span>
            </div>
            {returnData.sale?.invoiceNumber && (
              <div>
                <span className="text-slate-400 block font-medium">Original Invoice:</span>
                <span className="font-bold text-blue-600">#{returnData.sale.invoiceNumber}</span>
              </div>
            )}
            {returnData.bankName && (
              <div>
                <span className="text-slate-400 block font-medium">Bank / Wallet:</span>
                <span className="font-bold text-purple-700">{returnData.bankName}</span>
              </div>
            )}
            {returnData.bankReference && (
              <div>
                <span className="text-slate-400 block font-medium">Bank Ref #:</span>
                <span className="font-bold text-slate-700">{returnData.bankReference}</span>
              </div>
            )}
          </div>

          {/* Returned Products Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">📦 Restocked Products</h4>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/80 border-b text-slate-600">
                  <tr>
                    <th className="p-2.5 text-left font-semibold">Product</th>
                    <th className="p-2.5 text-center font-semibold">Quantity</th>
                    <th className="p-2.5 text-right font-semibold">Refund Rate</th>
                    <th className="p-2.5 text-right font-semibold">Total Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnData.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-medium text-slate-900">
                        {item.product?.name || "Product"}
                        <span className="text-[10px] text-slate-400 block font-mono">{item.product?.sku}</span>
                      </td>
                      <td className="p-2.5 text-center font-bold font-mono">
                        {Number(item.quantity)} {item.product?.unit?.abbreviation || "units"}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(item.unitRefundRate || item.refundAmount / item.quantity)}
                      </td>
                      <td className="p-2.5 text-right font-bold font-mono text-rose-600">
                        {formatCurrency(item.refundAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Summary */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex justify-between items-center">
            <span className="text-xs font-medium text-slate-300">Total Refund Processed:</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              {formatCurrency(returnData.totalRefund)}
            </span>
          </div>

          {returnData.notes && (
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border">
              <strong className="text-slate-800">Notes:</strong> {returnData.notes}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
