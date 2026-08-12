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

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
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

  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/buyers")
        .then((res) => res.json())
        .then((data) => setBuyers(data.filter((b: any) => b.isActive)))
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

      if (!res.ok) throw new Error("Failed to record payment");

      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error recording payment");
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
            >
              <option value="">-- Select a Buyer --</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name} {buyer.companyName ? `(${buyer.companyName})` : ""}
                </option>
              ))}
            </select>
            {errors.buyerId && <p className="text-red-500 text-xs">{errors.buyerId.message as string}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount">Amount Received (PKR) *</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              className="text-lg font-bold text-emerald-600"
              {...register("amount", { required: "Amount is required" })}
            />
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
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {isLoading ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
