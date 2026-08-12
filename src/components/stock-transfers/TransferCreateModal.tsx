"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TransferCreateModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fromBranchId: "",
    toBranchId: "",
    notes: ""
  });
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/stock-transfers", {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Stock Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Branch ID</Label>
              <Input required value={formData.fromBranchId} onChange={e => setFormData({...formData, fromBranchId: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>To Branch ID</Label>
              <Input required value={formData.toBranchId} onChange={e => setFormData({...formData, toBranchId: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Items</Label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input placeholder="Product ID" required value={item.productId} onChange={e => {
                  const newItems = [...items];
                  newItems[index].productId = e.target.value;
                  setItems(newItems);
                }} />
                <Input type="number" placeholder="Qty" min="1" required value={item.quantity} onChange={e => {
                  const newItems = [...items];
                  newItems[index].quantity = Number(e.target.value);
                  setItems(newItems);
                }} className="w-24" />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { productId: "", quantity: 1 }])}>
              Add Item
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Create Transfer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
