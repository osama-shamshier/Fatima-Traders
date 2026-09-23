"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { recordOfflineBuyer } from "@/lib/offline/cacheService";

interface BuyerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  buyer?: any; // If provided, it's edit mode
}

export function BuyerFormModal({ isOpen, onClose, onSuccess, buyer }: BuyerFormModalProps) {
  const t = useTranslations("buyers");
  const tc = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: buyer?.name || "",
      companyName: buyer?.companyName || "",
      contactNumber: buyer?.contactNumber || "",
      address: buyer?.address || "",
      notes: buyer?.notes || "",
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (buyer) {
        reset({
          name: buyer.name || "",
          companyName: buyer.companyName || "",
          contactNumber: buyer.contactNumber || "",
          address: buyer.address || "",
          notes: buyer.notes || "",
        });
      } else {
        reset({
          name: "",
          companyName: "",
          contactNumber: "",
          address: "",
          notes: "",
        });
      }
    }
  }, [isOpen, buyer, reset]);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      let isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (!isOffline) {
        try {
          const url = buyer ? `/api/buyers/${buyer.id}` : "/api/buyers";
          const method = buyer ? "PUT" : "POST";
          
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          if (res.ok) {
            reset();
            onSuccess();
            onClose();
            return;
          }
        } catch (netErr) {
          console.warn("Online buyer save failed, falling back to offline:", netErr);
          isOffline = true;
        }
      }

      if (isOffline && !buyer) {
        await recordOfflineBuyer(data);
        reset();
        onSuccess();
        onClose();
        return;
      }

      throw new Error("Failed to save buyer");
    } catch (error) {
      console.error(error);
      alert("Error saving buyer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">{buyer ? t("modalEditTitle") : t("modalAddTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 mt-2">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">{t("labelName")} *</Label>
            <Input id="name" {...register("name", { required: "Name is required" })} className="bg-white text-xs" />
            {errors.name && <p className="text-rose-500 text-xs">{errors.name.message as string}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="companyName" className="text-xs font-semibold">{t("labelCompany")}</Label>
            <Input id="companyName" {...register("companyName")} className="bg-white text-xs" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactNumber" className="text-xs font-semibold">{t("labelPhone")}</Label>
            <Input id="contactNumber" {...register("contactNumber")} className="bg-white text-xs font-mono" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs font-semibold">{t("labelAddress")}</Label>
            <Textarea id="address" {...register("address")} className="bg-white text-xs min-h-[60px]" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs font-semibold">{t("labelNotes")}</Label>
            <Textarea id="notes" {...register("notes")} className="bg-white text-xs min-h-[60px]" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {isLoading ? tc("saving") : t("saveBuyer")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
