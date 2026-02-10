// components/logout-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clear cookies via server action
      await logoutAction();

      // Clear client-side history
      window.history.replaceState(null, "", "/");

      // Force refresh to ensure clean state
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback redirect
      router.replace("/");
    }
  };

  return (
    <Button onClick={handleLogout} variant="outline">
      Logout
    </Button>
  );
}
