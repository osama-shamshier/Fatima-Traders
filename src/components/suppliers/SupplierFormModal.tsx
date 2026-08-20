"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: any;
}

export function SupplierFormModal({ isOpen, onClose, onSuccess, supplier }: SupplierFormModalProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: supplier?.name || "",
    contactNumber: supplier?.contactNumber || "",
    companyName: supplier?.companyName || "",
    address: supplier?.address || "",
    notes: supplier?.notes || "",
    isActive: supplier?.isActive ?? true,
  });

  const isEdit = !!supplier;

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({
          name: supplier.name || "",
          contactNumber: supplier.contactNumber || "",
          companyName: supplier.companyName || "",
          address: supplier.address || "",
          notes: supplier.notes || "",
          isActive: supplier.isActive ?? true,
        });
      } else {
        setFormData({
          name: "",
          contactNumber: "",
          companyName: "",
          address: "",
          notes: "",
          isActive: true,
        });
      }
    }
  }, [isOpen, supplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckedChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save supplier");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error saving supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          <DialogHeader className="border-b pb-3 mb-2">
            <DialogTitle className="text-xl font-bold text-slate-900">{isEdit ? t("modalEditTitle") : t("modalAddTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">{t("labelName")} *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} className="bg-white text-xs" required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="companyName" className="text-xs font-semibold">{t("labelCompany")}</Label>
            <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} className="bg-white text-xs" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactNumber" className="text-xs font-semibold">{t("labelPhone")}</Label>
            <Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="bg-white text-xs font-mono" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs font-semibold">{t("labelAddress")}</Label>
            <Textarea id="address" name="address" value={formData.address} onChange={handleChange} className="bg-white text-xs min-h-[60px]" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs font-semibold">{t("labelNotes")}</Label>
            <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className="bg-white text-xs min-h-[60px]" />
          </div>

          {isEdit && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={handleCheckedChange} />
              <label htmlFor="isActive" className="text-xs font-semibold">
                {t("labelActive")}
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {loading ? tc("saving") : t("saveSupplier")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
