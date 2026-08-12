"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReturnCreateModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    saleId: "",
    branchId: "",
    buyerId: "",
    refundMethod: "CASH",
    notes: ""
  });
  const [items, setItems] = useState([{ productId: "", quantity: 1, unitRefundRate: 0, reason: "" }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, items })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Process Sales Return</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Branch ID</Label>
              <Input required value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Sale ID (Optional)</Label>
              <Input value={formData.saleId} onChange={e => setFormData({...formData, saleId: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Buyer ID (Optional)</Label>
              <Input value={formData.buyerId} onChange={e => setFormData({...formData, buyerId: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Refund Method</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.refundMethod} 
                onChange={e => setFormData({...formData, refundMethod: e.target.value})}
              >
                <option value="CASH">CASH</option>
                <option value="BUYER_CREDIT">BUYER CREDIT</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Items to Return</Label>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                <Input placeholder="Product ID" required value={item.productId} onChange={e => {
                  const newItems = [...items];
                  newItems[index].productId = e.target.value;
                  setItems(newItems);
                }} />
                <Input type="number" placeholder="Qty" min="1" required value={item.quantity} onChange={e => {
                  const newItems = [...items];
                  newItems[index].quantity = Number(e.target.value);
                  setItems(newItems);
                }} />
                <Input type="number" placeholder="Refund Rate" min="0" required value={item.unitRefundRate} onChange={e => {
                  const newItems = [...items];
                  newItems[index].unitRefundRate = Number(e.target.value);
                  setItems(newItems);
                }} />
                <Input placeholder="Reason" value={item.reason} onChange={e => {
                  const newItems = [...items];
                  newItems[index].reason = e.target.value;
                  setItems(newItems);
                }} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: 1, unitRefundRate: 0, reason: "" }])}>
              Add Item
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Processing..." : "Process Return"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
