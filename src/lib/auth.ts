import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const email = (credentials.email as string).trim().toLowerCase();
          const password = credentials.password as string;

          const user = await prisma.user.findFirst({
            where: {
              email: { equals: email, mode: "insensitive" },
              isDeleted: false,
              isActive: true,
            },
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
              branch: true,
            },
          });

          if (!user) {
            console.log(`[Auth] User not found for email: ${email}`);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            console.log(`[Auth] Invalid password for user: ${email}`);
            return null;
          }

          const roles = user.userRoles.map((ur) => ur.role.name);
          const permissions = user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map(
              (rp) => `${rp.permission.module}:${rp.permission.action}`
            )
          );

          console.log(`[Auth] User logged in successfully: ${email} (${roles.join(", ")})`);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles,
            permissions,
            branchId: user.branchId,
            branchName: user.branch?.name || null,
          };
        } catch (error) {
          console.error("[Auth] Database error during authorize:", error);
          return null;
        }
      },
    }),
  ],
});
