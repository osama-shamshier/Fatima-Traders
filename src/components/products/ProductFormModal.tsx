"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  description: z.string().optional(),
  sellingPrice: z.number().min(0, "Selling price must be at least 0"),
  minStockLevel: z.number().min(0, "Min stock level must be at least 0"),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSuccess: () => void;
}

export function ProductFormModal({ isOpen, onClose, product, onSuccess }: ProductFormModalProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      categoryId: product?.categoryId || "",
      unitId: product?.unitId || "",
      description: product?.description || "",
      sellingPrice: product?.sellingPrice || 0,
      minStockLevel: product?.minStockLevel || 0,
      isActive: product?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/categories")
        .then((res) => res.json())
        .then((data) => setCategories(data));
      fetch("/api/units")
        .then((res) => res.json())
        .then((data) => setUnits(data));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: ProductFormValues) => {
    setSubmitError("");
    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Something went wrong");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message);
    }
  };

  const generateSku = () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    setValue("sku", `SKU-${randomChars}-${timestamp}`, { shouldValidate: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 my-8">
        <div className="flex items-center justify-between border-b pb-3 mb-5">
          <h2 className="text-xl font-bold text-slate-900">{product ? t("modalEditTitle") : t("modalAddTitle")}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelName")} *</label>
              <input
                {...register("name")}
                className="input text-xs bg-white text-slate-900 font-medium border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
                placeholder="e.g. Milk Powder 1kg"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelSku")} *</label>
              <div className="flex gap-2">
                <input
                  {...register("sku")}
                  className="input text-xs bg-white text-slate-900 font-mono font-semibold border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 flex-1"
                  placeholder="SKU-XXXX-1234"
                />
                <Button type="button" variant="outline" onClick={generateSku} className="px-3 text-xs" title="Auto-generate SKU">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {errors.sku && <p className="mt-1 text-xs text-rose-600">{errors.sku.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelCategory")} *</label>
              <select
                {...register("categoryId")}
                className="input text-xs bg-white text-slate-900 font-medium border-slate-300 focus:border-blue-500 w-full"
              >
                <option value="">{t("selectCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="mt-1 text-xs text-rose-600">{errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelUnit")} *</label>
              <select
                {...register("unitId")}
                className="input text-xs bg-white text-slate-900 font-medium border-slate-300 focus:border-blue-500 w-full"
              >
                <option value="">{t("selectUnit")}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id} className="text-slate-900">
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
              {errors.unitId && <p className="mt-1 text-xs text-rose-600">{errors.unitId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelPrice")} *</label>
              <input
                type="number"
                step="0.01"
                {...register("sellingPrice", { valueAsNumber: true })}
                className="input text-xs bg-white text-slate-900 font-mono font-bold border-slate-300 focus:border-blue-500 w-full"
              />
              {errors.sellingPrice && <p className="mt-1 text-xs text-rose-600">{errors.sellingPrice.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelMinStock")} *</label>
              <input
                type="number"
                step="0.01"
                {...register("minStockLevel", { valueAsNumber: true })}
                className="input text-xs bg-white text-slate-900 font-mono font-semibold border-slate-300 focus:border-blue-500 w-full"
              />
              {errors.minStockLevel && <p className="mt-1 text-xs text-rose-600">{errors.minStockLevel.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t("labelDescription")}</label>
            <textarea
              {...register("description")}
              className="input text-xs bg-white text-slate-900 border-slate-300 min-h-[80px] w-full"
              placeholder="Product details, packaging size, or supplier notes"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-800">
              {t("labelActive")}
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
              {isSubmitting ? t("saving") : t("saveProduct")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
