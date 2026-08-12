import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const roles = (session.user as any).roles as string[] || [];
  const userRole = roles[0] || "User";

  return (
    <DashboardLayoutClient 
      userName={session.user.name || "User"} 
      userRole={userRole}
    >
      {children}
    </DashboardLayoutClient>
  );
}
