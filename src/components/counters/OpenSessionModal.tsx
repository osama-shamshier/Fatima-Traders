"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  openingAmount: z.number().min(0, "Amount cannot be negative"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function OpenSessionModal({ isOpen, onClose, counter, onSuccess }: { isOpen: boolean, onClose: () => void, counter: any, onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { openingAmount: 0 }
  });

  useEffect(() => {
    if (isOpen) {
      reset({ openingAmount: 0, notes: "" });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/counters/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashCounterId: counter.id,
          ...data
        })
      });
      
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        console.error("Error opening session");
      }
    } catch (error) {
      console.error("Failed to open session", error);
    }
  };

  if (!counter) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Counter: {counter.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openingAmount">Opening Cash Amount (PKR) *</Label>
            <Input id="openingAmount" type="number" step="0.01" {...register("openingAmount", { valueAsNumber: true })} />
            {errors.openingAmount && <p className="text-red-500 text-sm">{errors.openingAmount.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Opening..." : "Open Session"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
