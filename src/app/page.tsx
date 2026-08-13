import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const roles = ((session.user as any).roles as string[]) || [];
  const isBillCounterManager = roles.includes("Bill Counter Manager");
  const isOwner = roles.includes("Owner") || roles.includes("Admin");

  if (!isOwner && isBillCounterManager) {
    redirect("/pos");
  }

  redirect("/dashboard");
}
