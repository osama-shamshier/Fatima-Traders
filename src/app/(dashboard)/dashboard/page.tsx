import { auth } from "@/lib/auth";
import { Package, ShoppingCart, TrendingUp, Building2, Plus, Users, Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Dashboard | RetailPro",
};

export default async function DashboardPage() {
  let session;
  try {
    session = await auth();
  } catch (error) {
    session = null;
  }
  
  const userName = session?.user?.name || "User";

  const stats = [
    {
      title: "Total Products",
      value: "1,245",
      icon: Package,
      color: "bg-blue-500",
      trend: "+12% from last month"
    },
    {
      title: "Sales Today",
      value: "Rs. 45,231.00",
      icon: ShoppingCart,
      color: "bg-emerald-500",
      trend: "+8% from yesterday"
    },
    {
      title: "Total Revenue",
      value: "Rs. 1,234,567.00",
      icon: TrendingUp,
      color: "bg-purple-500",
      trend: "+24% from last month"
    },
    {
      title: "Active Branches",
      value: "4",
      icon: Building2,
      color: "bg-orange-500",
      trend: "All operational"
    }
  ];

  const quickActions = [
    { name: "New Sale", href: "/sales/new", icon: Plus, color: "text-emerald-600 bg-emerald-100" },
    { name: "Add Product", href: "/products/new", icon: Package, color: "text-blue-600 bg-blue-100" },
    { name: "Record Expense", href: "/expenses/new", icon: Receipt, color: "text-orange-600 bg-orange-100" },
    { name: "Add Customer", href: "/buyers/new", icon: Users, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm text-slate-500">
          Welcome back, {userName}! Here's what's happening with your stores today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg text-white shadow-sm", stat.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-600">
                {stat.trend}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="group flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", action.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-slate-700">{action.name}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-600" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  );
}
