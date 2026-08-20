"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

const adjustmentTypes = [
  { id: "CORRECTION", labelKey: "correction" },
  { id: "DAMAGED", labelKey: "damaged" },
  { id: "EXPIRED", labelKey: "expired" },
  { id: "MISSING", labelKey: "missing" },
  { id: "OTHER", labelKey: "other" },
];

const formSchema = z.object({
  adjustmentType: z.enum(["DAMAGED", "EXPIRED", "CORRECTION", "MISSING", "OTHER"]),
  newQty: z.number().min(0, "Quantity cannot be negative"),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventory: any;
  onComplete: () => void;
}

export function StockAdjustmentModal({ isOpen, onClose, inventory, onComplete }: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustmentType: "CORRECTION",
      newQty: Number(inventory.quantity),
      reason: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: inventory.productId,
          branchId: inventory.branchId,
          adjustmentType: data.adjustmentType,
          newQty: data.newQty,
          reason: data.reason,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to adjust stock");
      }

      reset();
      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">{t("modalAdjustTitle")}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {t("modalAdjustDesc", { product: inventory.product?.name || "Product", branch: inventory.branch?.name || "Branch" })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {error && <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-md font-semibold border border-rose-200">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">{t("currentQty")}</Label>
              <Input value={Number(inventory.quantity)} disabled className="bg-slate-100 font-mono font-bold text-slate-700" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newQty" className="text-xs font-semibold">{t("newQty")} *</Label>
              <Input
                id="newQty"
                type="number"
                step="any"
                {...register("newQty", { valueAsNumber: true })}
                className="bg-white font-mono font-bold text-blue-600"
              />
              {errors.newQty && <p className="text-xs text-rose-500 mt-0.5">{errors.newQty.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adjustmentType" className="text-xs font-semibold">{t("adjustmentType")} *</Label>
            <select
              id="adjustmentType"
              className="input text-xs bg-white w-full"
              {...register("adjustmentType")}
            >
              {adjustmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {t(type.labelKey as any)}
                </option>
              ))}
            </select>
            {errors.adjustmentType && <p className="text-xs text-rose-500 mt-0.5">{errors.adjustmentType.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason" className="text-xs font-semibold">{t("reason")}</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Broken packaging / Physical inventory count mismatch"
              className="text-xs bg-white min-h-[70px]"
              {...register("reason")}
            />
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
              {loading ? tc("saving") : t("confirmAdjustment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
