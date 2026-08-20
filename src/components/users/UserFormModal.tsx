"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonSpinner } from "@/components/ui/loader";
import { useTranslations } from "next-intl";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  phone: z.string().optional(),
  branchId: z.string().optional().nullable(),
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any;
  roles: any[];
  branches: any[];
}

export default function UserFormModal({ isOpen, onClose, onSuccess, user, roles, branches }: UserFormModalProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");

  const isEditMode = !!user;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      branchId: "",
      roleIds: [],
      isActive: true,
    },
  });

  const selectedRoleIds = watch("roleIds") || [];

  useEffect(() => {
    if (user) {
      setValue("name", user.name || "");
      setValue("email", user.email || "");
      setValue("phone", user.phone || "");
      setValue("branchId", user.branchId || "");
      setValue("isActive", user.isActive ?? true);
      setValue(
        "roleIds",
        user.userRoles?.map((ur: any) => ur.role.id) || []
      );
    }
  }, [user, setValue]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    setError(null);

    // If edit mode and password is empty, we don't send it
    if (isEditMode && !data.password) {
      delete data.password;
    }

    try {
      const url = isEditMode ? `/api/users/${user.id}` : "/api/users";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setValue("roleIds", selectedRoleIds.filter((id) => id !== roleId), { shouldValidate: true });
    } else {
      setValue("roleIds", [...selectedRoleIds, roleId], { shouldValidate: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm modal-overlay" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh] modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 modal-header">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditMode ? t("modalEditTitle") : t("modalAddTitle")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto modal-body flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t("labelName")}</label>
                <input
                  type="text"
                  {...register("name")}
                  className={cn(
                    "w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
                    errors.name ? "border-rose-500" : "border-slate-300"
                  )}
                />
                {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t("labelEmail")}</label>
                <input
                  type="email"
                  {...register("email")}
                  className={cn(
                    "w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
                    errors.email ? "border-rose-500" : "border-slate-300"
                  )}
                />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t("labelPassword")} {isEditMode && <span className="text-[11px] text-slate-400 font-normal">{t("passwordHint")}</span>}
                </label>
                <input
                  type="password"
                  {...register("password")}
                  className={cn(
                    "w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
                    errors.password ? "border-rose-500" : "border-slate-300"
                  )}
                />
                {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t("labelPhone")}</label>
                <input
                  type="text"
                  {...register("phone")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700">{t("labelBranch")}</label>
                <select
                  {...register("branchId")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">{t("selectBranch")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700">{t("labelRoles")}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span className="text-slate-700 font-semibold">{role.name}</span>
                    </label>
                  ))}
                  {roles.length === 0 && (
                    <p className="text-xs text-slate-500 col-span-full">No roles available.</p>
                  )}
                </div>
                {errors.roleIds && <p className="text-xs text-rose-500">{errors.roleIds.message}</p>}
              </div>

              <div className="space-y-1 md:col-span-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("isActive")}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">{t("labelActive")}</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 modal-footer rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            {tc("cancel")}
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
          >
            {isSubmitting && <ButtonSpinner />}
            {isSubmitting ? tc("saving") : t("saveUser")}
          </button>
        </div>
      </div>
    </div>
  );
}
