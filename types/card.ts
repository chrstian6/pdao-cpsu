// types/card.ts
import { z } from "zod";

// ============ ZOD SCHEMAS ============

// Card Schema
export const CardSchema = z.object({
  // MongoDB _id
  _id: z.any().optional(),

  // Card ID (format: 06-4511-000-0000000)
  card_id: z
    .string()
    .regex(
      /^\d{2}-\d{4}-\d{3}-\d{7}$/,
      "Card ID must follow format: 06-4511-000-0000000",
    ),

  // User reference
  user_id: z.string().min(1, "User ID is required"),

  // Personal Information
  name: z.string().min(1, "Name is required").max(200),
  barangay: z.string().min(1, "Barangay is required"),
  type_of_disability: z.enum([
    "Physical Disability",
    "Visual Impairment",
    "Hearing Impairment",
    "Speech Impairment",
    "Intellectual Disability",
    "Learning Disability",
    "Mental Disability",
    "Multiple Disabilities",
    "Others",
  ]),
  address: z.string().min(1, "Address is required"),
  date_of_birth: z.date(),
  sex: z.enum(["Male", "Female", "Other"]),
  blood_type: z.enum([
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
    "Unknown",
  ]),
  date_issued: z.date().default(() => new Date()),

  // Emergency Contact
  emergency_contact_name: z
    .string()
    .min(1, "Emergency contact name is required"),
  emergency_contact_number: z
    .string()
    .min(1, "Emergency contact number is required"),

  // Status
  status: z.enum(["Active", "Expired", "Revoked", "Pending"]).default("Active"),

  // Face verification data
  face_image_url: z.string().url().nullable().optional(),
  face_descriptors: z.array(z.number()).nullable().optional(),
  id_image_url: z.string().url().nullable().optional(),
  extracted_data: z.any().nullable().optional(),

  // Verification tracking
  last_verified_at: z.date().nullable().optional(),
  verification_count: z.number().default(0),

  // Metadata
  created_by: z.string().nullable().optional(),
  updated_by: z.string().nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Card Creation Schema
export const CardCreateSchema = CardSchema.omit({
  _id: true,
  status: true,
  face_descriptors: true,
  last_verified_at: true,
  verification_count: true,
  created_by: true,
  updated_by: true,
  created_at: true,
  updated_at: true,
});

// Card Update Schema
export const CardUpdateSchema = CardSchema.partial().omit({
  _id: true,
  card_id: true,
  created_by: true,
  created_at: true,
});

// Card Verification Schema
export const CardVerificationSchema = z.object({
  card_id: z.string(),
  face_image: z.instanceof(File).optional(),
  face_image_url: z.string().url().optional(),
});

// ============ TYPES ============
export type Card = z.infer<typeof CardSchema>;
export type CardCreate = z.infer<typeof CardCreateSchema>;
export type CardUpdate = z.infer<typeof CardUpdateSchema>;
export type CardVerification = z.infer<typeof CardVerificationSchema>;

// ============ INTERFACES ============
export interface ICard {
  card_id: string;
  user_id: string;
  name: string;
  barangay: string;
  type_of_disability: string;
  address: string;
  date_of_birth: Date;
  sex: "Male" | "Female" | "Other";
  blood_type: string;
  date_issued: Date;
  emergency_contact_name: string;
  emergency_contact_number: string;
  status: "Active" | "Expired" | "Revoked" | "Pending";
  face_image_url?: string | null;
  face_descriptors?: number[] | null;
  id_image_url?: string | null;
  extracted_data?: any | null;
  last_verified_at?: Date | null;
  verification_count?: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

// ============ CONSTANTS ============
export const DISABILITY_TYPES = [
  "Physical Disability",
  "Visual Impairment",
  "Hearing Impairment",
  "Speech Impairment",
  "Intellectual Disability",
  "Learning Disability",
  "Mental Disability",
  "Multiple Disabilities",
  "Others",
] as const;

export const BLOOD_TYPES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
] as const;

export const CARD_STATUSES = [
  "Active",
  "Expired",
  "Revoked",
  "Pending",
] as const;

// ============ HELPER FUNCTIONS ============

// Validate card ID format
export function isValidCardId(cardId: string): boolean {
  const regex = /^\d{2}-\d{4}-\d{3}-\d{7}$/;
  return regex.test(cardId);
}

// Format card ID (add hyphens if missing)
export function formatCardId(input: string): string {
  // Remove all non-digits
  const digits = input.replace(/\D/g, "");

  // Check if we have enough digits
  if (digits.length >= 16) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 16)}`;
  }

  return input;
}

// Extract card ID parts
export function extractCardIdParts(cardId: string): {
  prefix: string;
  code: string;
  series: string;
  number: string;
} {
  const parts = cardId.split("-");
  return {
    prefix: parts[0] || "",
    code: parts[1] || "",
    series: parts[2] || "",
    number: parts[3] || "",
  };
}

// Calculate age from date of birth
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Get status color
export function getCardStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Expired":
      return "bg-red-100 text-red-800";
    case "Revoked":
      return "bg-gray-100 text-gray-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
