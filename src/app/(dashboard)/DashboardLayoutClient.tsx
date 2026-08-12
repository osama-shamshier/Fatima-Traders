"use client";

import { useState } from "react";
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        userName={userName}
        userRole={userRole}
      />
      <div className="flex flex-1 flex-col md:pl-64">
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
