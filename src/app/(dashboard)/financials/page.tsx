"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";

export default function FinancialsPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingCashFlow, setLoadingCashFlow] = useState(true);

  useEffect(() => {
    fetch("/api/financials/ledger")
      .then(r => r.json())
      .then(setLedger)
      .finally(() => setLoadingLedger(false));

    fetch("/api/financials/cash-flow")
      .then(r => r.json())
      .then(setCashFlow)
      .finally(() => setLoadingCashFlow(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Financials & Accounting</h1>
      </div>

      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ledger">General Ledger</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <div className="rounded-md border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              {loadingLedger ? (
                <Loader text="Loading ledger..." className="py-12" />
              ) : (
                <div className="relative w-full overflow-auto max-h-[600px]">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-card z-10 shadow-sm">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Debit (-)</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Credit (+)</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {ledger.map((entry, index) => (
                        <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle whitespace-nowrap">{formatDate(new Date(entry.date))}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={entry.credit > 0 ? "success" : "muted"}>{entry.type}</Badge>
                          </td>
                          <td className="p-4 align-middle">{entry.description}</td>
                          <td className="p-4 align-middle text-right text-red-500 font-medium">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                          </td>
                          <td className="p-4 align-middle text-right text-green-600 font-medium">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                          </td>
                          <td className={cn("p-4 align-middle text-right font-bold", entry.balance >= 0 ? "text-green-600" : "text-red-500")}>
                            {formatCurrency(entry.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          {loadingCashFlow ? (
            <Loader text="Loading cash flow..." className="py-12" />
          ) : cashFlow && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(cashFlow.totalCashIn)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Sales & Buyer Payments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(cashFlow.totalCashOut)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Purchases, Expenses & Refunds</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-2xl font-bold", cashFlow.netCashFlow >= 0 ? "text-green-600" : "text-red-500")}>
                      {formatCurrency(cashFlow.netCashFlow)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Cash Inflows Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sales Cash</span>
                        <span className="text-sm font-bold text-green-600">{formatCurrency(cashFlow.breakdown.salesCash)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Buyer Payments</span>
                        <span className="text-sm font-bold text-green-600">{formatCurrency(cashFlow.breakdown.buyerPaymentsTotal)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cash Outflows Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Purchases Cash</span>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(cashFlow.breakdown.purchasesCash)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Supplier Payments</span>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(cashFlow.breakdown.supplierPaymentsTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Operating Expenses</span>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(cashFlow.breakdown.operatingExpensesTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Refunds</span>
                        <span className="text-sm font-bold text-red-500">{formatCurrency(cashFlow.breakdown.refundsTotal)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
