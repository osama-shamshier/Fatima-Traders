"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  branchId: z.string().min(1, "Branch is required"),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function CounterFormModal({ isOpen, onClose, counter, onSuccess }: { isOpen: boolean, onClose: () => void, counter?: any, onSuccess: () => void }) {
  const [branches, setBranches] = useState<any[]>([]);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { isActive: true }
  });

  useEffect(() => {
    if (isOpen) {
      fetch("/api/branches").then(res => res.json()).then(data => setBranches(data));
      
      if (counter) {
        reset({
          name: counter.name,
          branchId: counter.branchId,
          isActive: counter.isActive,
        });
      } else {
        reset({ name: "", branchId: "", isActive: true });
      }
    }
  }, [isOpen, counter, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const url = counter ? `/api/counters/${counter.id}` : "/api/counters";
      const method = counter ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error("Error saving counter");
      }
    } catch (error) {
      console.error("Failed to save counter", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{counter ? "Edit Counter" : "Add Counter"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Counter Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branchId">Branch *</Label>
            <select 
              id="branchId" 
              {...register("branchId")} 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branchId && <p className="text-red-500 text-sm">{errors.branchId.message}</p>}
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isActive" defaultChecked={counter?.isActive ?? true} onCheckedChange={(c) => setValue("isActive", c as boolean)} />
            <Label htmlFor="isActive">Active</Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
