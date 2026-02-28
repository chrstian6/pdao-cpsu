// types/item.ts
import { z } from "zod";

// ============ ZOD SCHEMAS ============

// Item Zod Schema for PWD Distribution
export const ItemSchema = z.object({
  // MongoDB _id
  _id: z.any().optional(),

  // Auto-generated sequential ID (e.g., ITEM-00001, ITEM-00002)
  item_id: z
    .string()
    .regex(/^ITEM-\d{5}$/, "Invalid item ID format (ITEM-#####)")
    .optional()
    .default(() => {
      return "ITEM-00000";
    }),

  // Item image stored in Supabase
  item_image_url: z
    .string()
    .url("Invalid URL format")
    .nullable()
    .optional()
    .default(null),

  // Basic item information
  item_name: z
    .string()
    .min(1, "Item name is required")
    .max(200, "Item name cannot exceed 200 characters"),

  item_description: z
    .string()
    .max(1000, "Item description cannot exceed 1000 characters")
    .optional()
    .default(""),

  // Distribution category
  category: z
    .enum([
      "Medical Supplies",
      "Mobility Aids",
      "Food Assistance",
      "Hygiene Kits",
      "Assistive Devices",
      "Medicines",
      "Vitamins",
      "Wheelchairs",
      "Crutches",
      "Canes",
      "Hearing Aids",
      "Glasses",
      "Diapers",
      "Milk",
      "Other",
    ])
    .default("Medical Supplies"),

  // Inventory management for distribution
  stock: z
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative")
    .default(0),

  // Request queue tracking
  pending_requests: z.number().int().min(0).default(0),
  reserved_stock: z.number().int().min(0).default(0),

  // Unit of distribution
  unit: z
    .enum([
      "piece",
      "box",
      "pack",
      "bottle",
      "pair",
      "set",
      "kg",
      "liter",
      "can",
      "sachet",
    ])
    .default("piece"),

  // Item status
  status: z
    .enum([
      "Available",
      "Low Stock",
      "Out of Stock",
      "Reserved",
      "For Repair",
      "Damaged",
    ])
    .default("Available"),

  // Location/Storage
  location: z
    .string()
    .max(200, "Location cannot exceed 200 characters")
    .optional()
    .default("Main Storage"),

  // Expiry date for perishable/medical items
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable()
    .default(null),

  // Distribution-specific fields
  is_medical: z.boolean().default(false),
  requires_prescription: z.boolean().default(false),
  requires_med_cert: z.boolean().default(false),
  requires_brgy_cert: z.boolean().default(false),
  is_consumable: z.boolean().default(true),

  // For assistive devices that need fitting
  needs_fitting: z.boolean().default(false),

  // For items with sizes (wheelchairs, crutches, etc.)
  size: z
    .string()
    .max(50, "Size cannot exceed 50 characters")
    .optional()
    .nullable()
    .default(null),

  // Manufacturer/Brand
  brand: z
    .string()
    .max(100, "Brand cannot exceed 100 characters")
    .optional()
    .nullable()
    .default(null),

  // Distribution history reference
  total_distributed: z.number().int().min(0).default(0),

  last_distribution_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable()
    .default(null),

  // Metadata
  created_by: z.string().optional().nullable().default(null),
  updated_by: z.string().optional().nullable().default(null),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Item Creation Schema (for creating new items)
// Omit fields that are auto-generated or system-managed
export const ItemCreateSchema = ItemSchema.omit({
  _id: true,
  item_id: true,
  pending_requests: true,
  reserved_stock: true,
  total_distributed: true,
  last_distribution_date: true,
  created_by: true,
  updated_by: true,
  created_at: true,
  updated_at: true,
}).partial({
  location: true,
  expiry_date: true,
  size: true,
  brand: true,
  item_image_url: true,
  item_description: true,
});

// Item Update Schema (for updating existing items)
// Allow updating most fields but keep system fields protected
export const ItemUpdateSchema = ItemSchema.omit({
  _id: true,
  item_id: true,
  pending_requests: true,
  reserved_stock: true,
  total_distributed: true,
  created_by: true,
  created_at: true,
  updated_at: true,
})
  .partial()
  .extend({
    // Allow explicitly setting updated_by during updates
    updated_by: z.string().optional().nullable().default(null),
    // Allow updating last_distribution_date manually if needed
    last_distribution_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .default(null),
  });

// Item Public Schema (for client-side display with computed fields)
export const ItemPublicSchema = ItemSchema.extend({
  stock_status: z.enum(["Normal", "Low", "Critical", "Out"]).optional(),
  available_stock: z.number().optional(),
  days_until_expiry: z.number().optional().nullable(),
  is_expired: z.boolean().optional(),
  needs_reorder: z.boolean().optional(),
  requires_certificates: z.boolean().optional(),
  certificate_types: z.array(z.enum(["medical", "barangay"])).optional(),
});

// Stock Alert Schema
export const StockAlertSchema = z.object({
  item_id: z.string(),
  item_name: z.string(),
  current_stock: z.number(),
  available_stock: z.number(),
  status: z.enum(["Low Stock", "Out of Stock", "Expiring Soon"]),
  message: z.string(),
  priority: z.enum(["High", "Medium", "Low"]),
});

// Item Filter Schema (for filtering items in queries)
export const ItemFilterSchema = z.object({
  category: z.string().optional(),
  status: z
    .enum([
      "Available",
      "Low Stock",
      "Out of Stock",
      "Reserved",
      "For Repair",
      "Damaged",
    ])
    .optional(),
  is_medical: z.boolean().optional(),
  requires_prescription: z.boolean().optional(),
  requires_med_cert: z.boolean().optional(),
  requires_brgy_cert: z.boolean().optional(),
  needs_fitting: z.boolean().optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  min_stock: z.number().optional(),
  max_stock: z.number().optional(),
  expiry_before: z.string().optional(),
  expiry_after: z.string().optional(),
});

// ============ TYPES ============
export type Item = z.infer<typeof ItemSchema>;
export type ItemCreate = z.infer<typeof ItemCreateSchema>;
export type ItemUpdate = z.infer<typeof ItemUpdateSchema>;
export type ItemPublic = z.infer<typeof ItemPublicSchema>;
export type StockAlert = z.infer<typeof StockAlertSchema>;
export type ItemFilter = z.infer<typeof ItemFilterSchema>;

// ============ INTERFACES ============
export interface IItem {
  item_id: string;
  item_image_url?: string | null;
  item_name: string;
  item_description?: string;
  category:
    | "Medical Supplies"
    | "Mobility Aids"
    | "Food Assistance"
    | "Hygiene Kits"
    | "Assistive Devices"
    | "Medicines"
    | "Vitamins"
    | "Wheelchairs"
    | "Crutches"
    | "Canes"
    | "Hearing Aids"
    | "Glasses"
    | "Diapers"
    | "Milk"
    | "Other";
  stock: number;
  pending_requests: number;
  reserved_stock: number;
  unit:
    | "piece"
    | "box"
    | "pack"
    | "bottle"
    | "pair"
    | "set"
    | "kg"
    | "liter"
    | "can"
    | "sachet";
  status:
    | "Available"
    | "Low Stock"
    | "Out of Stock"
    | "Reserved"
    | "For Repair"
    | "Damaged";
  location?: string;
  expiry_date?: string | null;
  is_medical: boolean;
  requires_prescription: boolean;
  requires_med_cert: boolean;
  requires_brgy_cert: boolean;
  is_consumable: boolean;
  needs_fitting: boolean;
  size?: string | null;
  brand?: string | null;
  total_distributed: number;
  last_distribution_date?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

// ============ CONSTANTS ============
export const ITEM_CATEGORIES = [
  "Medical Supplies",
  "Mobility Aids",
  "Food Assistance",
  "Hygiene Kits",
  "Assistive Devices",
  "Medicines",
  "Vitamins",
  "Wheelchairs",
  "Crutches",
  "Canes",
  "Hearing Aids",
  "Glasses",
  "Diapers",
  "Milk",
  "Other",
] as const;

export const ITEM_UNITS = [
  "piece",
  "box",
  "pack",
  "bottle",
  "pair",
  "set",
  "kg",
  "liter",
  "can",
  "sachet",
] as const;

export const ITEM_STATUSES = [
  "Available",
  "Low Stock",
  "Out of Stock",
  "Reserved",
  "For Repair",
  "Damaged",
] as const;

export const STOCK_STATUSES = ["Normal", "Low", "Critical", "Out"] as const;

export const CERTIFICATE_REQUIREMENTS = [
  "requires_med_cert",
  "requires_brgy_cert",
] as const;

// ============ HELPER FUNCTIONS ============

// Get stock status based on current stock and threshold
export function getStockStatus(
  stock: number,
  threshold: number = 5,
): "Normal" | "Low" | "Critical" | "Out" {
  if (stock <= 0) return "Out";
  if (stock <= Math.ceil(threshold / 2)) return "Critical";
  if (stock <= threshold) return "Low";
  return "Normal";
}

// Check if item is low on stock
export function isLowStock(stock: number, threshold: number = 5): boolean {
  return stock <= threshold && stock > 0;
}

// Check if item is out of stock
export function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}

// Calculate days until expiry
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

// Check if item is expired
export function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;

  const expiry = new Date(expiryDate);
  const today = new Date();
  return expiry < today;
}

// Check if item is expiring soon
export function isExpiringSoon(
  expiryDate: string | null,
  days: number = 30,
): boolean {
  if (!expiryDate) return false;

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  return (
    daysUntilExpiry !== null && daysUntilExpiry <= days && daysUntilExpiry > 0
  );
}

// Calculate available stock (total - reserved)
export function getAvailableStock(stock: number, reserved: number): number {
  return stock - reserved;
}

// Check if item requires any certificates
export function requiresCertificates(item: Partial<IItem>): boolean {
  return !!(item.requires_med_cert || item.requires_brgy_cert);
}

// Get list of required certificates
export function getRequiredCertificates(
  item: Partial<IItem>,
): Array<"medical" | "barangay"> {
  const certificates: Array<"medical" | "barangay"> = [];
  if (item.requires_med_cert) certificates.push("medical");
  if (item.requires_brgy_cert) certificates.push("barangay");
  return certificates;
}

// Generate a stock alert message
export function generateStockAlert(
  item: Pick<
    IItem,
    | "item_id"
    | "item_name"
    | "stock"
    | "expiry_date"
    | "requires_med_cert"
    | "requires_brgy_cert"
  >,
): StockAlert | null {
  const availableStock = item.stock;

  if (availableStock <= 0) {
    return {
      item_id: item.item_id,
      item_name: item.item_name,
      current_stock: item.stock,
      available_stock: 0,
      status: "Out of Stock",
      message: `${item.item_name} is out of stock`,
      priority: "High",
    };
  }

  if (availableStock <= 5) {
    let message = `${item.item_name} is low on stock (${availableStock} remaining)`;
    if (requiresCertificates(item)) {
      const certs = getRequiredCertificates(item);
      message += ` - Requires: ${certs.join(" and ")} certificate(s)`;
    }
    return {
      item_id: item.item_id,
      item_name: item.item_name,
      current_stock: item.stock,
      available_stock: availableStock,
      status: "Low Stock",
      message,
      priority: availableStock <= 2 ? "High" : "Medium",
    };
  }

  if (item.expiry_date && isExpiringSoon(item.expiry_date)) {
    const daysLeft = getDaysUntilExpiry(item.expiry_date);
    return {
      item_id: item.item_id,
      item_name: item.item_name,
      current_stock: item.stock,
      available_stock: availableStock,
      status: "Expiring Soon",
      message: `${item.item_name} expires in ${daysLeft} days`,
      priority: daysLeft && daysLeft <= 7 ? "High" : "Medium",
    };
  }

  return null;
}

// Format certificate requirements for display
export function formatCertificateRequirements(
  requires_med_cert: boolean,
  requires_brgy_cert: boolean,
): string {
  const requirements: string[] = [];
  if (requires_med_cert) requirements.push("Medical Certificate");
  if (requires_brgy_cert) requirements.push("Barangay Certificate");

  if (requirements.length === 0) return "No certificates required";
  if (requirements.length === 1) return requirements[0];
  return requirements.join(" and ");
}

// Check if item is available for distribution based on certificate requirements
export function isAvailableForDistribution(
  item: Pick<IItem, "stock" | "requires_med_cert" | "requires_brgy_cert">,
  hasMedCert: boolean = false,
  hasBrgyCert: boolean = false,
): { available: boolean; reason?: string } {
  if (item.stock <= 0) {
    return { available: false, reason: "Out of stock" };
  }

  if (item.requires_med_cert && !hasMedCert) {
    return { available: false, reason: "Medical certificate required" };
  }

  if (item.requires_brgy_cert && !hasBrgyCert) {
    return { available: false, reason: "Barangay certificate required" };
  }

  return { available: true };
}
