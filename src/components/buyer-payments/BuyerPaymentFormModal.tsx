"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAKISTANI_BANKS } from "@/lib/constants";

interface BuyerPaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BuyerPaymentFormModal({ isOpen, onClose, onSuccess }: BuyerPaymentFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [buyers, setBuyers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      buyerId: "",
      saleId: "",
      amount: "",
      paymentMethod: "CASH",
      bankName: "",
      bankReference: "",
      notes: "",
    },
  });

  const selectedBuyerId = watch("buyerId");
  const enteredAmount = watch("amount");
  const paymentMethod = watch("paymentMethod");

  const selectedBuyer = buyers.find((b) => b.id === selectedBuyerId);
  const maxAllowedAmount = selectedBuyer ? Number(selectedBuyer.totalOutstanding || 0) : 0;

  useEffect(() => {
    if (isOpen) {
      fetch("/api/buyers")
        .then((res) => res.json())
        .then((data) => setBuyers(Array.isArray(data) ? data.filter((b: any) => b.isActive) : []))
        .catch(console.error);
    }
  }, [isOpen]);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const refText = [data.bankName ? `Bank: ${data.bankName}` : null, data.bankReference ? `Ref: ${data.bankReference}` : null]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        buyerId: data.buyerId,
        saleId: data.saleId || undefined,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        bankReference: refText || undefined,
        notes: data.notes,
      };

      const res = await fetch("/api/buyer-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to record payment");
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error recording payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900">Record Customer Payment / Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="buyerId">Select Buyer / Customer *</Label>
            <select
              id="buyerId"
              className="input text-sm bg-white"
              {...register("buyerId", { required: "Buyer is required" })}
              onChange={(e) => {
                setValue("buyerId", e.target.value);
                const b = buyers.find((x) => x.id === e.target.value);
                if (b && b.totalOutstanding > 0) {
                  setValue("amount", String(b.totalOutstanding));
                } else {
                  setValue("amount", "");
                }
              }}
            >
              <option value="">-- Select a Buyer --</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name} {buyer.companyName ? `(${buyer.companyName})` : ""} - Credit: Rs. {Number(buyer.totalOutstanding || 0).toLocaleString()}
                </option>
              ))}
            </select>
            {errors.buyerId && <p className="text-red-500 text-xs">{errors.buyerId.message as string}</p>}
          </div>

          {selectedBuyer && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${maxAllowedAmount > 0 ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-emerald-50 text-emerald-900 border-emerald-200"}`}>
              <span>Total Outstanding Credit:</span>
              <span className="text-sm font-bold">Rs. {maxAllowedAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="amount">Amount Received (PKR) *</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              className="text-lg font-bold text-emerald-600"
              {...register("amount", {
                required: "Amount is required",
                validate: {
                  positive: (v) => Number(v) > 0 || "Amount must be greater than 0",
                  notExceed: (v) => {
                    if (!selectedBuyer) return true;
                    if (maxAllowedAmount === 0) return "Customer has Rs. 0 credit balance";
                    return (
                      Number(v) <= maxAllowedAmount ||
                      `Amount cannot exceed credit balance (Rs. ${maxAllowedAmount.toLocaleString()})`
                    );
                  },
                },
              })}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message as string}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <select id="paymentMethod" className="input text-sm bg-white" {...register("paymentMethod")}>
              <option value="CASH">💵 Cash</option>
              <option value="BANK_TRANSFER">🏦 Bank Transfer / Digital Wallet</option>
            </select>
          </div>

          {paymentMethod === "BANK_TRANSFER" && (
            <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
              <div className="space-y-1">
                <Label className="text-xs">Pakistani Bank / Digital Wallet *</Label>
                <select className="input text-xs bg-white" {...register("bankName")}>
                  <option value="">Select Bank / Wallet</option>
                  {PAKISTANI_BANKS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Bank Reference / TRX #</Label>
                <Input placeholder="TRX-123456" className="text-xs" {...register("bankReference")} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" className="text-xs" {...register("notes")} />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (selectedBuyer && maxAllowedAmount === 0) || (enteredAmount && Number(enteredAmount) > maxAllowedAmount)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
