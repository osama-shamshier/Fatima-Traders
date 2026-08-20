"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ChevronDown, ChevronRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";

const roleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, "Select at least one permission"),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: any | null;
}

export function RoleFormModal({ isOpen, onClose, onSuccess, roleToEdit }: RoleFormModalProps) {
  const t = useTranslations("roles");
  const tc = useTranslations("common");

  const [permissionsByModule, setPermissionsByModule] = useState<Record<string, any[]>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissionIds: [],
    },
  });

  const selectedPermissionIds = watch("permissionIds") || [];

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      if (roleToEdit) {
        reset({
          name: roleToEdit.name,
          description: roleToEdit.description || "",
          permissionIds: roleToEdit.permissions.map((p: any) => p.id),
        });
      } else {
        reset({
          name: "",
          description: "",
          permissionIds: [],
        });
      }
      setError(null);
    }
  }, [isOpen, roleToEdit, reset]);

  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/permissions");
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const data = await res.json();
      setPermissionsByModule(data);
      
      // Open all modules by default
      const initialExpanded: Record<string, boolean> = {};
      Object.keys(data).forEach((mod) => {
        initialExpanded[mod] = true;
      });
      setExpandedModules(initialExpanded);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  const togglePermission = (id: string) => {
    const current = [...selectedPermissionIds];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setValue("permissionIds", current, { shouldValidate: true });
  };

  const toggleAllInModule = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => selectedPermissionIds.includes(id));

    let updated: string[];
    if (allSelected) {
      updated = selectedPermissionIds.filter((id) => !modulePermIds.includes(id));
    } else {
      updated = Array.from(new Set([...selectedPermissionIds, ...modulePermIds]));
    }
    setValue("permissionIds", updated, { shouldValidate: true });
  };

  const isModuleAllSelected = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    if (modulePerms.length === 0) return false;
    return modulePerms.every((p) => selectedPermissionIds.includes(p.id));
  };

  const isModulePartiallySelected = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const count = modulePerms.filter((p) => selectedPermissionIds.includes(p.id)).length;
    return count > 0 && count < modulePerms.length;
  };

  const onSubmit = async (data: RoleFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = roleToEdit ? `/api/roles/${roleToEdit.id}` : "/api/roles";
      const method = roleToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save role");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {roleToEdit ? t("modalEditTitle") : t("modalAddTitle")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t("labelRoleName")}
              </label>
              <input
                type="text"
                {...register("name")}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="e.g. Sales Manager, Cashier"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t("labelDescription")}
              </label>
              <textarea
                {...register("description")}
                rows={2}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="Role responsibility summary..."
              />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  {t("permissionsMatrix")}
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedPermissionIds.length} permissions active
                </span>
              </div>
              {errors.permissionIds && (
                <p className="mt-1 text-xs text-rose-500">{errors.permissionIds.message}</p>
              )}

              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {Object.entries(permissionsByModule).map(([module, perms]) => {
                  const isAll = isModuleAllSelected(module);
                  const isPart = isModulePartiallySelected(module);
                  const isExpanded = expandedModules[module] !== false;

                  return (
                    <div key={module} className="bg-white">
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleModule(module)}
                          className="flex items-center gap-2 font-bold text-slate-800 text-xs capitalize hover:text-blue-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                          <span>{module.replace("_", " ")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAllInModule(module)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              isAll
                                ? "border-blue-600 bg-blue-600 text-white"
                                : isPart
                                ? "border-blue-600 bg-blue-100"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isAll && <Check className="h-3 w-3 stroke-[3]" />}
                            {isPart && !isAll && (
                              <div className="h-1.5 w-1.5 rounded-xs bg-blue-600" />
                            )}
                          </div>
                          <span>{t("selectAll")}</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-white">
                          {perms.map((p) => {
                            const isSelected = selectedPermissionIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-xs ${
                                  isSelected
                                    ? "border-blue-200 bg-blue-50/50"
                                    : "border-slate-100 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePermission(p.id)}
                                  className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[11px] font-medium text-slate-700 capitalize">
                                  {p.action}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-xs"
            >
              {isLoading ? tc("saving") : t("saveRole")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
