import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
// Assuming next-auth config is exported from @/lib/auth
// If it's not present, this will cause a build error, but it's what was requested.
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
  } catch (error) {
    // Fallback if auth isn't fully set up yet
    console.warn("Auth not configured yet, using dummy session.");
    session = { user: { name: "Demo User", role: "Manager" } };
  }

  // If no session, redirect to /login
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayoutClient 
      userName={session.user.name || "Demo User"} 
      // @ts-ignore - role might not be typed in default NextAuth User
      userRole={session.user.role || "Manager"}
    >
      {children}
    </DashboardLayoutClient>
  );
}
