import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|site\\.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|json|webp)$).*)",
  ],
};
