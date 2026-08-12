"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const adjustmentTypes = [
  "DAMAGED",
  "EXPIRED",
  "CORRECTION",
  "MISSING",
  "OTHER"
]

const formSchema = z.object({
  adjustmentType: z.enum(["DAMAGED", "EXPIRED", "CORRECTION", "MISSING", "OTHER"]),
  newQty: z.number().min(0, "Quantity cannot be negative"),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  isOpen: boolean
  onClose: () => void
  inventory: any
  onComplete: () => void
}

export function StockAdjustmentModal({ isOpen, onClose, inventory, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adjustmentType: "CORRECTION",
      newQty: Number(inventory.quantity),
      reason: "",
    }
  })

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: inventory.productId,
          branchId: inventory.branchId,
          adjustmentType: data.adjustmentType,
          newQty: data.newQty,
          reason: data.reason,
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to adjust stock")
      }

      reset()
      onComplete()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Adjust stock for {inventory.product?.name} at {inventory.branch?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Quantity</Label>
              <Input value={Number(inventory.quantity)} disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newQty">New Quantity</Label>
              <Input 
                id="newQty" 
                type="number" 
                step="any"
                {...register("newQty", { valueAsNumber: true })} 
              />
              {errors.newQty && <p className="text-sm text-red-500">{errors.newQty.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustmentType">Adjustment Type</Label>
            <select
              id="adjustmentType"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("adjustmentType")}
            >
              {adjustmentTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.adjustmentType && <p className="text-sm text-red-500">{errors.adjustmentType.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea 
              id="reason" 
              placeholder="Explain why this adjustment is being made..."
              {...register("reason")} 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
