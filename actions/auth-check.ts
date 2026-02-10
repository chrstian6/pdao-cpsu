// actions/auth-check.ts
"use server";

import { getCurrentUser } from "./auth";
import { TokenPayload } from "@/lib/jwt";

export interface AuthCheckResult {
  authenticated: boolean;
  user?: {
    admin_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    full_name: string;
    age: number;
    email: string;
    role: string;
  };
  message?: string;
}

export async function checkAuthServerAction(): Promise<AuthCheckResult> {
  try {
    const user = await getCurrentUser();

    if (user) {
      return {
        authenticated: true,
        user: {
          admin_id: user.admin_id,
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          full_name: user.full_name,
          age: user.age,
          email: user.email,
          role: user.role,
        },
      };
    }

    return {
      authenticated: false,
      message: "Not authenticated",
    };
  } catch (error) {
    console.error("Auth check error:", error);
    return {
      authenticated: false,
      message: "Server error",
    };
  }
}
