"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseCategoryModal({ isOpen, onClose, onSuccess }: Props) {
  const t = useTranslations("expenses");
  const tc = useTranslations("common");

  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        reset();
        onSuccess();
        onClose();
      } else {
        alert("Failed to create category");
      }
    } catch (error) {
      console.error(error);
      alert("Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900">{t("modalCatTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">{t("catName")}</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Rent, Utilities, Transport, Salaries" className="text-xs bg-white" />
            {errors.name && <span className="text-xs text-rose-500">{errors.name.message}</span>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs font-semibold">{t("catDesc")}</Label>
            <Textarea id="description" {...register("description")} placeholder="Optional description..." className="text-xs bg-white" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {loading ? tc("saving") : t("saveCat")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
