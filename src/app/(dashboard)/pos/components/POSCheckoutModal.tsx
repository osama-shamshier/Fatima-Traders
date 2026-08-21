"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAKISTANI_BANKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Calendar, AlertTriangle, Calculator, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface POSCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discount: number;
  itemsGrossTotal?: number;
  itemsDiscountTotal?: number;
  initialRoundOff?: number;
  isWalkInCustomer?: boolean;
  onCompleteSale: (
    amountPaid: number,
    paymentMethod: string,
    bankName?: string,
    bankReference?: string,
    dueDate?: string,
    roundOff?: number
  ) => Promise<void> | void;
}

export function POSCheckoutModal({
  isOpen,
  onClose,
  subtotal,
  discount,
  itemsGrossTotal,
  itemsDiscountTotal = 0,
  initialRoundOff = 0,
  isWalkInCustomer = true,
  onCompleteSale,
}: POSCheckoutModalProps) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");

  const [roundOff, setRoundOff] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [bankName, setBankName] = useState<string>("");
  const [bankReference, setBankReference] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      setIsSubmitting(false);

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

  const handleConfirm = async () => {
    if (isSubmitting || isWalkInCreditBlocked) return;
    setIsSubmitting(true);
    try {
      await onCompleteSale(
        amountPaid,
        paymentMethod,
        bankName,
        bankReference,
        isPartial ? dueDate : undefined,
        roundOff
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-slate-900">{t("checkoutModalTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Bill Summary Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            {itemsGrossTotal !== undefined && itemsGrossTotal > subtotal && (
              <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                <span>{t("grossSubtotal")}:</span>
                <span className="font-bold font-mono">{formatCurrency(itemsGrossTotal)}</span>
              </div>
            )}

            {itemsDiscountTotal > 0 && (
              <div className="flex justify-between items-center text-xs text-rose-600 font-medium">
                <span>{t("itemDiscounts")} (-):</span>
                <span className="font-bold font-mono">- {formatCurrency(itemsDiscountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-slate-700 font-medium">
              <span>{t("grossSubtotal")}:</span>
              <span className="font-bold font-mono">{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center text-xs text-amber-700 font-medium">
                <span>{t("orderDiscount")} (-):</span>
                <span className="font-bold font-mono">- {formatCurrency(discount)}</span>
              </div>
            )}

            {/* Round Off Input Field */}
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/80">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-blue-600" /> {t("roundOffAdjustment")} (+/-):
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
                <span className="text-[10px] font-bold text-slate-500 uppercase">{t("quickRounding")}:</span>
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
                    {t("reset")}
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800 text-sm">{t("grandTotal")}:</span>
              <span className="text-2xl font-extrabold font-mono text-blue-700">{formatCurrency(netPayable)}</span>
            </div>
          </div>

          {/* Payment Method Toggle (Cash vs Bank Transfer) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("paymentMethod")} *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === "CASH"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("cash")}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("bankTransfer")}
              </button>
            </div>
          </div>

          {/* Bank Selection & Reference Details */}
          {paymentMethod === "BANK_TRANSFER" && (
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-blue-900">{t("selectBank")} *</Label>
                <select
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input text-xs bg-white mt-1 w-full"
                >
                  <option value="">-- {t("selectBank")} --</option>
                  {PAKISTANI_BANKS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-blue-900">{t("bankRef")}</Label>
                <Input
                  placeholder="e.g. TRX-982341 or Cheque #"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className="text-xs mt-1 bg-white"
                />
              </div>
            </div>
          )}

          {/* Amount Paid & Quick Cash Pills */}
          {/* Amount Paid & Quick Cash Pills */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("amountPaid")} *</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAmountPaid(netPayable)}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700"
                >
                  {t("exact")} ({formatCurrency(netPayable)})
                </button>
                {[500, 1000, 5000]
                  .filter((note) => note <= netPayable)
                  .map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setAmountPaid(Math.min(note, netPayable))}
                      className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700"
                    >
                      Rs. {note}
                    </button>
                  ))}
              </div>
            </div>

            <Input
              type="number"
              min="0"
              max={netPayable}
              step="any"
              value={amountPaid === 0 ? "" : amountPaid}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isNaN(val) || val < 0) {
                  setAmountPaid(0);
                } else if (val > netPayable) {
                  setAmountPaid(netPayable);
                } else {
                  setAmountPaid(val);
                }
              }}
              className="text-2xl font-black font-mono py-2 text-slate-900 bg-white"
              autoFocus
            />
            {amountPaid > netPayable && (
              <p className="text-xs text-amber-600 font-medium">
                Paid amount cannot exceed total bill of {formatCurrency(netPayable)}
              </p>
            )}
          </div>

          {/* Walk-in Customer Blocking Alert */}
          {isWalkInCreditBlocked && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">{t("walkInCreditBlockedTitle")}</strong>
                <span>{t("walkInCreditBlockedMsg", { amount: formatCurrency(netPayable) })}</span>
              </div>
            </div>
          )}

          {/* Due Date & Remaining Credit for Registered Buyer */}
          {isPartial && !isWalkInCustomer && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">{t("creditDue")}:</span>
                <span className="font-extrabold font-mono text-rose-600 text-sm">
                  {formatCurrency(netPayable - amountPaid)}
                </span>
              </div>

              <div>
                <Label className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {t("expectedDueDate")}
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs mt-1 bg-white font-medium"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || isWalkInCreditBlocked || (paymentMethod === "BANK_TRANSFER" && !bankName)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("processing")}
              </>
            ) : (
              <>
                {t("processPayment")} ({formatCurrency(netPayable)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
