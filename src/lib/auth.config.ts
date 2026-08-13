import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id as string;
        token.roles = (user as any).roles;
        token.permissions = (user as any).permissions;
        token.branchId = (user as any).branchId;
        token.branchName = (user as any).branchName;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).roles = token.roles;
        (session.user as any).permissions = token.permissions;
        (session.user as any).branchId = token.branchId;
        (session.user as any).branchName = token.branchName;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }: any) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const publicRoutes = ["/login", "/api/auth"];
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

      if (isPublicRoute) return true;
      if (isLoggedIn) return true;

      return false; // Redirect to login
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  providers: [], // Providers added in auth.ts (not in Edge)
} satisfies NextAuthConfig;
