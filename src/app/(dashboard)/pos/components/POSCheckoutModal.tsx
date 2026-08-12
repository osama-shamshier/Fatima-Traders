"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Calendar, AlertTriangle, Calculator } from "lucide-react";

interface POSCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discount: number;
  initialRoundOff?: number;
  isWalkInCustomer?: boolean;
  onCompleteSale: (
    amountPaid: number,
    paymentMethod: string,
    bankName?: string,
    bankReference?: string,
    dueDate?: string,
    roundOff?: number
  ) => void;
}

export function POSCheckoutModal({
  isOpen,
  onClose,
  subtotal,
  discount,
  initialRoundOff = 0,
  isWalkInCustomer = true,
  onCompleteSale,
}: POSCheckoutModalProps) {
  const [roundOff, setRoundOff] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [bankName, setBankName] = useState<string>("");
  const [bankReference, setBankReference] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const rawTotal = Math.max(0, subtotal - discount);
  const netPayable = Math.max(0, rawTotal + (Number(roundOff) || 0));

  useEffect(() => {
    if (isOpen) {
      const initRound = initialRoundOff || 0;
      setRoundOff(initRound);
      setAmountPaid(Math.max(0, rawTotal + initRound));
      setPaymentMethod("CASH");
      setBankName("");
      setBankReference("");

      // Default due date to 7 days from today
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 7);
      setDueDate(defaultDue.toISOString().split("T")[0]);
    }
  }, [isOpen, rawTotal, initialRoundOff]);

  // Handle round off change
  const handleRoundOffChange = (val: number) => {
    setRoundOff(val);
    setAmountPaid(Math.max(0, rawTotal + val));
  };

  const change = Math.max(0, amountPaid - netPayable);
  const isPartial = amountPaid < netPayable;
  const isWalkInCreditBlocked = isWalkInCustomer && isPartial;

  // Round off suggestions
  const lowerRound = Math.floor(rawTotal / 10) * 10;
  const upperRound = Math.ceil(rawTotal / 10) * 10;
  const lowerDiff = lowerRound - rawTotal;
  const upperDiff = upperRound - rawTotal;
  const showSuggestions = rawTotal > 0 && rawTotal % 10 !== 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-slate-900">Complete Payment Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Bill Summary Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center text-xs text-amber-700 font-medium">
                <span>Discount:</span>
                <span className="font-bold font-mono">- {formatCurrency(discount)}</span>
              </div>
            )}

            {/* Round Off Input Field */}
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/80">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-blue-600" /> Round-Off Adjustment:
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  value={roundOff === 0 ? "" : roundOff}
                  onChange={(e) => handleRoundOffChange(Number(e.target.value))}
                  placeholder="0"
                  className="w-24 text-right text-xs py-1 h-7 font-mono font-bold bg-white border-blue-300"
                />
              </div>
            </div>

            {/* Quick Round Off Buttons */}
            {showSuggestions && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Quick Rounding:</span>
                <button
                  type="button"
                  onClick={() => handleRoundOffChange(lowerDiff)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-all ${
                    roundOff === lowerDiff
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  Rs. {lowerRound} ({lowerDiff > 0 ? `+${lowerDiff}` : lowerDiff})
                </button>
                {upperRound !== lowerRound && (
                  <button
                    type="button"
                    onClick={() => handleRoundOffChange(upperDiff)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-all ${
                      roundOff === upperDiff
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    Rs. {upperRound} ({upperDiff > 0 ? `+${upperDiff}` : upperDiff})
                  </button>
                )}
                {roundOff !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleRoundOffChange(0)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800 text-sm">Net Bill Payable:</span>
              <span className="text-2xl font-extrabold font-mono text-blue-700">{formatCurrency(netPayable)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-xs text-slate-700">Select Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "CASH" ? "primary" : "outline"}
                className={`w-full py-2.5 text-xs font-semibold ${paymentMethod === "CASH" ? "bg-blue-600 text-white" : ""}`}
                onClick={() => setPaymentMethod("CASH")}
              >
                💵 Cash Payment
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "BANK_TRANSFER" ? "primary" : "outline"}
                className={`w-full py-2.5 text-xs font-semibold ${paymentMethod === "BANK_TRANSFER" ? "bg-blue-600 text-white" : ""}`}
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
              >
                🏦 Bank / Digital Wallet
              </Button>
            </div>
          </div>

          {paymentMethod === "BANK_TRANSFER" && (
            <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
              <div>
                <Label className="text-xs font-medium">Select Pakistani Bank / Wallet *</Label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input text-xs bg-white mt-1"
                  required
                >
                  <option value="">Choose Bank / Wallet</option>
                  {PAKISTANI_BANKS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium">Transaction / Bank Reference #</Label>
                <Input
                  placeholder="e.g. TRX-987654321"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="font-semibold text-xs text-slate-700">Amount Paid by Customer (PKR)</Label>
            <Input
              type="number"
              step="any"
              value={amountPaid || ""}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
              className="text-xl font-bold py-2 font-mono"
              autoFocus
            />
          </div>

          {paymentMethod === "CASH" && change > 0 && (
            <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
              <span className="text-xs font-medium">Cash Change to Return:</span>
              <span className="text-lg font-bold font-mono">{formatCurrency(change)}</span>
            </div>
          )}

          {/* WALK-IN CUSTOMER CREDIT BLOCKED WARNING */}
          {isWalkInCreditBlocked ? (
            <div className="p-3.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 space-y-1">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Credit Sales Blocked for Walk-in Customers</span>
              </div>
              <p className="text-xs text-rose-700 font-medium">
                Walk-in customers cannot buy on credit. Please collect full payment of{" "}
                <strong className="font-bold">{formatCurrency(netPayable)}</strong> or select a registered buyer.
              </p>
            </div>
          ) : isPartial ? (
            <div className="p-3.5 bg-amber-50/90 text-amber-900 rounded-xl border border-amber-200 space-y-2">
              <div className="flex justify-between items-center border-b border-amber-200/60 pb-1.5">
                <span className="text-xs font-bold uppercase">Remaining Pending Amount:</span>
                <span className="text-sm font-extrabold font-mono text-rose-700">{formatCurrency(netPayable - amountPaid)}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" /> Set Remaining Credit Payment Due Date *
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs bg-white text-slate-900 font-bold border-amber-300 focus:ring-amber-500"
                  required={isPartial}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onCompleteSale(
                amountPaid,
                paymentMethod,
                bankName,
                bankReference,
                isPartial ? dueDate : undefined,
                roundOff
              )
            }
            disabled={isWalkInCreditBlocked}
            className={`font-semibold shadow-sm ${
              isWalkInCreditBlocked
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            Confirm & Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
