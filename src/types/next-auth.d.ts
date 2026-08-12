import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
      permissions: string[];
      branchId: string | null;
      branchName: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    roles: string[];
    permissions: string[];
    branchId: string | null;
    branchName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    permissions: string[];
    branchId: string | null;
    branchName: string | null;
  }
}
