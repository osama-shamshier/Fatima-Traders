"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import UserFormModal from "@/components/users/UserFormModal";
import DeleteConfirmModal from "@/components/users/DeleteConfirmModal";
import { Edit, Trash2, Plus, Search, Users } from "lucide-react";
import { TableLoader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");

  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const url = search ? `/api/users?search=${encodeURIComponent(search)}` : "/api/users";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        fetch("/api/roles").catch(() => null),
        fetch("/api/branches").catch(() => null),
      ]);
      if (rolesRes?.ok) setRoles(await rolesRes.json());
      if (branchesRes?.ok) setBranches(await branchesRes.json());
    } catch (error) {
      console.error("Failed to fetch dependencies", error);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleDelete = (user: any) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDeletingUser(null);
        fetchUsers();
      } else {
        console.error("Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
        >
          <Plus className="w-4 h-4 me-1.5" /> {t("addUser")}
        </Button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-9 pe-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="p-3.5">{t("colName")}</th>
                <th className="p-3.5">{t("colEmail")}</th>
                <th className="p-3.5">{t("colBranch")}</th>
                <th className="p-3.5">{t("colRoles")}</th>
                <th className="p-3.5 text-center">{t("colStatus")}</th>
                <th className="p-3.5">{t("colJoined")}</th>
                <th className="p-3.5 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={7} text="Loading users..." />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {t("noUsers")}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{user.name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{user.email}</td>
                    <td className="p-3.5 text-slate-600">{user.branch?.name || "-"}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles?.map((ur: any) => (
                          <Badge key={ur.role.id} variant="outline" className="text-[10px] bg-slate-50">
                            {ur.role.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={user.isActive ? "success" : "outline"} className="text-[10px]">
                        {user.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          setIsFormModalOpen(false);
          fetchUsers();
        }}
        user={editingUser}
        roles={roles}
        branches={branches}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t("deleteTitle")}
        message={t("deleteMessage", { name: deletingUser?.name || "" })}
        loading={isDeleting}
      />
    </div>
  );
}
