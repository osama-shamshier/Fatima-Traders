"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { SupplierLedgerModal } from "@/components/suppliers/SupplierLedgerModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerSupplierId, setLedgerSupplierId] = useState("");
  const [ledgerSupplierName, setLedgerSupplierName] = useState("");

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSuppliers();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewLedger = (id: string, name: string) => {
    setLedgerSupplierId(id);
    setLedgerSupplierName(name);
    setIsLedgerModalOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAdd}>Add Supplier</Button>
        </div>
      </div>

      <div className="bg-white rounded-md border">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading suppliers...</div>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Company</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Outstanding Balance</th>
                  <th className="h-12 px-4 text-center align-middle font-medium">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{supplier.name}</td>
                    <td className="p-4 align-middle">{supplier.companyName || "-"}</td>
                    <td className="p-4 align-middle">{supplier.contactNumber || "-"}</td>
                    <td className="p-4 align-middle text-right font-bold text-red-600">
                      {formatCurrency(supplier.outstandingBalance)}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <Badge variant={supplier.isActive ? "success" : "muted"}>
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewLedger(supplier.id, supplier.name)}>Ledger</Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(supplier.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">No suppliers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchSuppliers}
        supplier={selectedSupplier}
      />

      <SupplierLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        supplierId={ledgerSupplierId}
        supplierName={ledgerSupplierName}
      />
    </div>
  );
}
