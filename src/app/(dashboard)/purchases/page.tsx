"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { PurchaseCreateModal } from "@/components/purchases/PurchaseCreateModal";
import { PurchaseViewModal } from "@/components/purchases/PurchaseViewModal";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const fetchPurchases = async () => {
    try {
      const res = await fetch("/api/purchases");
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAdd = () => {
    setIsCreateModalOpen(true);
  };

  const handleView = (id: string) => {
    setSelectedPurchaseId(id);
    setIsViewModalOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Purchases</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAdd}>New Purchase</Button>
        </div>
      </div>

      <div className="bg-white rounded-md border">
        {loading ? (
          <Loader text="Loading purchases..." className="py-12" />
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Invoice No</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Supplier</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Branch</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Total</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Paid</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Outstanding</th>
                  <th className="h-12 px-4 text-center align-middle font-medium">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">{formatDate(purchase.purchaseDate)}</td>
                    <td className="p-4 align-middle font-medium">{purchase.invoiceNumber}</td>
                    <td className="p-4 align-middle">{purchase.supplier?.name}</td>
                    <td className="p-4 align-middle">{purchase.branch?.name}</td>
                    <td className="p-4 align-middle text-right font-bold">{formatCurrency(purchase.totalAmount)}</td>
                    <td className="p-4 align-middle text-right text-green-600">{formatCurrency(purchase.amountPaid)}</td>
                    <td className="p-4 align-middle text-right text-red-600">{formatCurrency(purchase.outstandingAmount)}</td>
                    <td className="p-4 align-middle text-center">
                      <Badge variant={
                        purchase.paymentStatus === 'PAID' ? 'success' :
                        purchase.paymentStatus === 'PARTIAL' ? 'warning' : 'danger'
                      }>
                        {purchase.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Button variant="outline" size="sm" onClick={() => handleView(purchase.id)}>View</Button>
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-sm text-muted-foreground">No purchases found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PurchaseCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchPurchases}
      />

      <PurchaseViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        purchaseId={selectedPurchaseId}
      />
    </div>
  );
}
