"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  // Handle toggle logic
  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        setIsMobileOpen={setIsMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        userName={userName}
        userRole={userRole}
      />
      <div 
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0",
          isSidebarCollapsed ? "md:ps-0" : "md:ps-64"
        )}
      >
        <Header 
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          userName={userName}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
