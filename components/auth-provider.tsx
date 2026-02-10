// components/auth-provider.tsx
"use client";

import { useEffect } from "react";
import { refreshTokenAction } from "@/actions/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Set up token refresh interval (every 14 minutes)
    const interval = setInterval(
      async () => {
        try {
          await refreshTokenAction();
        } catch (error) {
          console.error("Token refresh failed:", error);
        }
      },
      14 * 60 * 1000,
    ); // 14 minutes

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
