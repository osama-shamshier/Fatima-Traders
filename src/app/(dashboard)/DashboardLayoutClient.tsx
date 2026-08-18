"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function DashboardLayoutClient({ 
  children,
  userName = "User",
  userRole = "Admin"
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isBillCounterManager = userRole === "Bill Counter Manager";
  const isOwner = userRole === "Owner" || userRole === "Admin";

  useEffect(() => {
    if (!isOwner && isBillCounterManager) {
      const allowedPaths = [
        "/pos",
        "/sales",
        "/sales-returns",
        "/buyers",
        "/buyer-due-dates",
        "/buyer-payments",
      ];

      const isAllowed = allowedPaths.some((path) => pathname === path || pathname?.startsWith(`${path}/`));

      if (!isAllowed) {
        router.replace("/pos");
      }
    }
  }, [pathname, isBillCounterManager, isOwner, router]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        userName={userName}
        userRole={userRole}
      />
      <div className="flex flex-1 flex-col md:ps-64">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          userName={userName}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
