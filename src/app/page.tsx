import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultUserRoute } from "@/lib/rbac";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const roles = ((session.user as any).roles as string[]) || [];
  const permissions = ((session.user as any).permissions as string[]) || [];

  const targetRoute = getDefaultUserRoute(roles, permissions);
  redirect(targetRoute);
}
