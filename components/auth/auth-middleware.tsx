// components/auth-middleware.tsx - UPDATED
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";

const publicRoutes = ["/", "/login", "/register"];
const protectedRoutes = ["/dashboard", "/profile", "/settings"];

export function AuthMiddleware({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, syncWithServer } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // Sync with server cookies first
      const serverAuthenticated = await syncWithServer();

      // Check if current route is protected
      const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route),
      );
      const isPublicRoute = publicRoutes.includes(pathname);

      if (isProtectedRoute && !serverAuthenticated) {
        // Server says not authenticated, redirect to login
        router.replace(`/?redirect=${encodeURIComponent(pathname)}`);
      } else if (isPublicRoute && serverAuthenticated) {
        // Already authenticated on public route, redirect to dashboard
        router.replace("/dashboard");
      }
    };

    checkAuth();
  }, [pathname, router, syncWithServer]);

  // Show loading state during initial auth check
  if (
    isLoading &&
    protectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
