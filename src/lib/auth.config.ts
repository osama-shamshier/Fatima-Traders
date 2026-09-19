import type { NextAuthConfig } from "next-auth";

// Ensure NEXTAUTH_URL has protocol if set to prevent Invalid URL crashes
if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith("http://") && !process.env.NEXTAUTH_URL.startsWith("https://")) {
  process.env.NEXTAUTH_URL = `https://${process.env.NEXTAUTH_URL}`;
}

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fatima-traders-production-secret-key-2026-minimum-32-chars",
  trustHost: true,
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

      const publicRoutes = [
        "/login",
        "/api/auth",
        "/api/debug-db",
        "/manifest.json",
        "/site.webmanifest",
        "/icon-192.png",
        "/icon-192-maskable.png",
        "/icon-512.png",
        "/icon-512-maskable.png",
        "/apple-touch-icon.png",
        "/favicon.png",
        "/favicon.ico",
        "/logo.png",
        "/logo.jpg",
      ];
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
  providers: [],
} satisfies NextAuthConfig;
