import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export function hasPermission(
  userPermissions: string[],
  module: string,
  action: string
): boolean {
  return userPermissions.includes(`${module}:${action}`);
}

export function hasRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role);
}

export function hasAnyRole(userRoles: string[], roles: string[]): boolean {
  return roles.some((role) => userRoles.includes(role));
}

export function isOwner(userRoles: string[]): boolean {
  return userRoles.includes("Owner") || userRoles.includes("Admin");
}

// RBAC module constants matching permissions table
export const MODULES = {
  USERS: "users",
  ROLES: "roles",
  BRANCHES: "branches",
  COUNTERS: "counters",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  UNITS: "units",
  INVENTORY: "inventory",
  PURCHASES: "purchases",
  SUPPLIERS: "suppliers",
  SUPPLIER_PAYMENTS: "supplier_payments",
  SALES: "sales",
  POS: "pos",
  BUYERS: "buyers",
  BUYER_PAYMENTS: "buyer_payments",
  RETURNS: "returns",
  EXPENSES: "expenses",
  STOCK_TRANSFERS: "stock_transfers",
  STOCK_ADJUSTMENTS: "stock_adjustments",
  REPORTS: "reports",
  AUDIT: "audit",
  SETTINGS: "settings",
  BACKUPS: "backups",
} as const;

export const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  EXPORT: "export",
} as const;

// Dynamic Route Permission Map
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": ["audit:read", "settings:read"],
  "/pos": ["pos:create", "pos:read", "sales:create", "sales:read"],
  "/branches": ["branches:read", "branches:create"],
  "/counters": ["counters:read", "counters:create"],
  "/products": ["products:read", "products:create", "products:update", "products:delete"],
  "/categories": ["categories:read", "categories:create"],
  "/units": ["units:read", "units:create"],
  "/buyers": ["buyers:read", "buyers:create", "buyers:update", "buyers:delete"],
  "/buyer-due-dates": ["buyers:read"],
  "/buyer-payments": ["buyer_payments:read", "buyer_payments:create"],
  "/suppliers": ["suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete"],
  "/supplier-payments": ["supplier_payments:read", "supplier_payments:create"],
  "/sales": ["sales:read", "sales:create"],
  "/sales-returns": ["returns:read", "returns:create"],
  "/purchases": ["purchases:read", "purchases:create", "purchases:update", "purchases:delete"],
  "/inventory": ["inventory:read", "stock_adjustments:read", "stock_adjustments:create"],
  "/stock-transfers": ["stock_transfers:read", "stock_transfers:create"],
  "/expenses": ["expenses:read", "expenses:create"],
  "/profit-loss": ["reports:read"],
  "/financials": ["reports:read"],
  "/reports": ["reports:read"],
  "/users": ["users:read", "users:create", "users:update", "users:delete"],
  "/roles": ["roles:read", "roles:create", "roles:update", "roles:delete"],
  "/audit-logs": ["audit:read"],
  "/settings": ["settings:read"],
  "/backups": ["backups:read"],
};

/**
 * Validates if the user's live permissions allow accessing a route
 */
export function canAccessRoute(
  pathname: string,
  userRoles: string[] = [],
  userPermissions: string[] = []
): boolean {
  if (isOwner(userRoles)) {
    return true;
  }

  // Exact or prefix match (ignoring query parameters)
  const cleanPath = pathname.split("?")[0];

  // Dashboard is strictly restricted to Owner / Admin
  if (cleanPath === "/dashboard") {
    return false;
  }

  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => cleanPath === route || (route !== "/dashboard" && cleanPath.startsWith(`${route}/`))
  );

  if (!matchedRoute) {
    return true;
  }

  const required = ROUTE_PERMISSIONS[matchedRoute];
  if (!required || required.length === 0) {
    return false;
  }

  return required.some((perm) => userPermissions.includes(perm));
}

/**
 * Returns the default fallback landing route for the user based on permissions
 */
export function getDefaultUserRoute(
  userRoles: string[] = [],
  userPermissions: string[] = []
): string {
  if (isOwner(userRoles)) {
    return "/dashboard";
  }

  const priorityRoutes = [
    "/pos",
    "/dashboard",
    "/products",
    "/sales",
    "/buyers",
    "/inventory",
    "/purchases",
    "/expenses",
  ];

  for (const route of priorityRoutes) {
    if (canAccessRoute(route, userRoles, userPermissions)) {
      return route;
    }
  }

  return "/pos";
}
