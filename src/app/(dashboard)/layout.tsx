import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userEmail = session.user.email?.toLowerCase();

  // Fetch real-time roles and permissions from database so changes apply instantly
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(userId ? [{ id: userId }] : []),
        ...(userEmail ? [{ email: { equals: userEmail, mode: "insensitive" as const } }] : []),
      ],
      isDeleted: false,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      module: true,
                      action: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  const userRole = roles[0] || "User";
  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`)
      )
    )
  );

  return (
    <DashboardLayoutClient 
      userName={user.name || session.user.name || "User"} 
      userRole={userRole}
      userRoles={roles}
      userPermissions={permissions}
    >
      {children}
    </DashboardLayoutClient>
  );
}
