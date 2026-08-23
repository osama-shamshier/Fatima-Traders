"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { canAccessRoute, getDefaultUserRoute, isOwner } from "@/lib/rbac";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  userRoles?: string[];
  userPermissions?: string[];
}

export function DashboardLayoutClient({ 
  children,
  userName = "User",
  userRole = "User",
  userRoles = [],
  userPermissions = [],
}: DashboardLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isOwner(userRoles)) {
      const allowed = canAccessRoute(pathname, userRoles, userPermissions);
      if (!allowed) {
        const fallbackRoute = getDefaultUserRoute(userRoles, userPermissions);
        router.replace(fallbackRoute);
      }
    }
  }, [pathname, userRoles, userPermissions, router]);

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
        userRoles={userRoles}
        userPermissions={userPermissions}
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
