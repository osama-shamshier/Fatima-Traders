"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function BranchFormModal({ isOpen, onClose, branch, onSuccess }: { isOpen: boolean, onClose: () => void, branch?: any, onSuccess: () => void }) {
  const t = useTranslations("branches");
  const tc = useTranslations("common");

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { isActive: true }
  });

  useEffect(() => {
    if (isOpen) {
      if (branch) {
        reset({
          name: branch.name,
          address: branch.address || "",
          phone: branch.phone || "",
          email: branch.email || "",
          isActive: branch.isActive,
        });
      } else {
        reset({ name: "", address: "", phone: "", email: "", isActive: true });
      }
    }
  }, [isOpen, branch, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const url = branch ? `/api/branches/${branch.id}` : "/api/branches";
      const method = branch ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error("Error saving branch");
      }
    } catch (error) {
      console.error("Failed to save branch", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl p-6">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">{branch ? t("modalEditTitle") : t("modalAddTitle")}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold">{t("labelName")} *</Label>
            <Input id="name" {...register("name")} className="bg-white" />
            {errors.name && <p className="text-rose-500 text-xs">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs font-semibold">{t("labelAddress")}</Label>
            <Input id="address" {...register("address")} className="bg-white" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold">{t("labelPhone")}</Label>
              <Input id="phone" {...register("phone")} className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold">{t("labelEmail")}</Label>
              <Input id="email" type="email" {...register("email")} className="bg-white" />
              {errors.email && <p className="text-rose-500 text-xs">{errors.email.message}</p>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isActive" defaultChecked={branch?.isActive ?? true} onCheckedChange={(c) => setValue("isActive", c as boolean)} />
            <Label htmlFor="isActive" className="text-xs font-semibold">{t("labelActive")}</Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {isSubmitting ? tc("saving") : t("saveBranch")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
