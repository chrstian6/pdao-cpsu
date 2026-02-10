// types/admin.ts
import { z } from "zod";

// Base Zod schema for validation (without auto-generated fields)
export const AdminCreateSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .transform(
      (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase(),
    ),
  middle_name: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : "",
    ),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .transform(
      (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase(),
    ),
  age: z
    .number()
    .int()
    .min(18, "Must be at least 18 years old")
    .max(100, "Age must be reasonable"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((val) => val.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  address: z
    .string()
    .min(1, "Address is required")
    .transform((val) =>
      val
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" "),
    ),
  phone_number: z
    .string()
    .regex(
      /^09[0-9]{9}$/,
      "Must be a valid Philippine phone number (09XXXXXXXXX)",
    ),
  role: z.enum(["MSWD-CSWDO-PDAO"]).default("MSWD-CSWDO-PDAO"),
});

// Schema for update (all fields optional except validation)
export const AdminUpdateSchema = AdminCreateSchema.partial().extend({
  admin_id: z
    .string()
    .regex(/^ADMN-[0-9]{4}$/)
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

// Schema for login
export const AdminLoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

// Schema for response (without password)
export const AdminResponseSchema = z.object({
  admin_id: z.string().regex(/^ADMN-[0-9]{4}$/),
  first_name: z.string(),
  middle_name: z.string().optional(),
  last_name: z.string(),
  age: z.number(),
  email: z.string(),
  address: z.string(),
  phone_number: z.string(),
  role: z.enum(["MSWD-CSWDO-PDAO"]),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

// TypeScript types
export type AdminCreateInput = z.infer<typeof AdminCreateSchema>;
export type AdminUpdateInput = z.infer<typeof AdminUpdateSchema>;
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;
export type AdminResponse = z.infer<typeof AdminResponseSchema>;

// Type for admin without sensitive data
export type SafeAdmin = Omit<AdminResponse, "password">;

// Type for admin list (paginated)
export interface AdminListResponse {
  admins: AdminResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Type for search/filter parameters
export interface AdminFilterParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Type for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}

// Specific API response types
export type AdminCreateResponse = ApiResponse<AdminResponse>;
export type AdminLoginResponse = ApiResponse<{
  admin: AdminResponse;
  token?: string;
}>;
export type AdminListApiResponse = ApiResponse<AdminListResponse>;

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  errors?: ValidationError[];
  statusCode: number;
}

// Utility types
export type PartialAdmin = Partial<AdminCreateInput> & { admin_id?: string };
