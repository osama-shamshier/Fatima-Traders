"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Shield, Lock } from "lucide-react";
import { RoleFormModal } from "@/components/roles/RoleFormModal";
import { TableLoader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function RolesPage() {
  const t = useTranslations("roles");
  const tc = useTranslations("common");

  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAdd = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDelete = async (role: any) => {
    if (role.isSystem) {
      alert("System roles cannot be deleted.");
      return;
    }
    
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      try {
        const res = await fetch(`/api/roles/${role.id}`, {
          method: "DELETE",
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        fetchRoles();
      } catch (error: any) {
        alert(error.message || "Failed to delete role");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
        >
          <Plus className="h-4 w-4 me-1.5" /> {t("addRole")}
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="p-3.5">{t("colRoleName")}</th>
                <th className="p-3.5">{t("colDescription")}</th>
                <th className="p-3.5 text-center">{t("colPermissions")}</th>
                <th className="p-3.5 text-center">{t("colType")}</th>
                <th className="p-3.5 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={5} text="Loading roles..." />
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {t("noRoles")}
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      {role.name}
                      {role.isSystem && (
                        <Lock className="w-3 h-3 text-slate-400" />
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">{role.description || "-"}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-blue-600">
                      {role.permissions?.length || 0}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={role.isSystem ? "primary" : "outline"} className="text-[10px]">
                        {role.isSystem ? t("systemRole") : t("customRole")}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(role)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RoleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchRoles();
        }}
        roleToEdit={selectedRole}
      />
    </div>
  );
}
