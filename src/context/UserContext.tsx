"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  branchId?: string | null;
  branchName?: string | null;
}

interface UserContextType {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});

const USER_STORAGE_KEY = "current_user_profile";

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser?: CurrentUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    if (initialUser) return initialUser;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore JSON parse error
      }
    }
    return null;
  });

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(initialUser));
      } catch {
        // ignore localStorage error
      }
    } else if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Fallback: fetch session from NextAuth /api/auth/session
          fetch("/api/auth/session")
            .then((r) => r.json())
            .then((data) => {
              if (data?.user) {
                const u: CurrentUser = {
                  id: data.user.id,
                  name: data.user.name,
                  email: data.user.email,
                  roles: data.user.roles,
                  permissions: data.user.permissions,
                  branchId: data.user.branchId,
                  branchName: data.user.branchName,
                };
                setUser(u);
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
              }
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, [initialUser]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
