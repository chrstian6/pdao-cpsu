import { z } from "zod";

// ============ ZOD SCHEMAS ============

// Request Item Schema (items within a request)
export const RequestItemSchema = z.object({
  item_id: z.string().regex(/^ITEM-\d{5}$/, "Invalid item ID format"),
  item_name: z.string(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unit: z.string(),
  requires_prescription: z.boolean().default(false),
  prescription_image_url: z.string().url().optional().nullable().default(null),
  prescription_verified: z.boolean().default(false),
  verified_by: z.string().optional().nullable(),
  verified_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Approved Item Schema
export const ApprovedItemSchema = z.object({
  item_id: z.string(),
  quantity_approved: z.number().int().positive(),
});

// Rejected Item Schema
export const RejectedItemSchema = z.object({
  item_id: z.string(),
  reason: z.string(),
});

// Main Request Schema
export const RequestSchema = z.object({
  // MongoDB _id
  _id: z.any().optional(),

  // Auto-generated sequential ID (e.g., REQ-00001, REQ-00002)
  request_id: z
    .string()
    .regex(/^REQ-\d{5}$/, "Invalid request ID format (REQ-#####)")
    .optional()
    .default(() => "REQ-00000"),

  // Requester (PWD Patient)
  requester_id: z
    .string()
    .regex(/^PDAO-\d{8}-[A-Z0-9]{5}$/, "Invalid user ID format"),
  requester_name: z.string(),
  requester_barangay: z.string(),
  requester_contact: z.string().optional(),

  // Request details
  items: z.array(RequestItemSchema).min(1, "At least one item is required"),

  // Purpose/Reason
  purpose: z
    .string()
    .max(500, "Purpose cannot exceed 500 characters")
    .optional(),

  // Queue information
  queue_number: z.number().int().positive().optional(),
  queue_position: z.number().int().min(0).default(0),
  estimated_wait_time: z.number().int().optional().nullable(), // in minutes

  // Status tracking
  status: z
    .enum([
      "Pending", // New request, waiting in queue
      "In Queue", // In queue, not yet processed
      "Processing", // Being processed by staff
      "Approved", // Approved, ready for distribution
      "Partially Approved", // Some items approved, some rejected
      "Rejected", // Request rejected
      "Ready for Pickup", // Items ready to be picked up
      "Completed", // Successfully distributed
      "Cancelled", // Cancelled by requester
    ])
    .default("Pending"),

  // Priority (for queue ordering)
  priority: z.enum(["Emergency", "High", "Normal", "Low"]).default("Normal"),

  // For emergency cases
  is_emergency: z.boolean().default(false),
  emergency_notes: z.string().optional().nullable(),

  // Medical documents
  has_prescription: z.boolean().default(false),
  prescription_images: z.array(z.string().url()).optional().default([]),

  // Approval/Rejection details
  approved_items: z.array(ApprovedItemSchema).optional().default([]),
  rejected_items: z.array(RejectedItemSchema).optional().default([]),
  rejection_reason: z.string().optional().nullable(),

  // Processing details
  processed_by: z.string().optional().nullable(),
  processed_at: z.string().optional().nullable(),

  approved_by: z.string().optional().nullable(),
  approved_at: z.string().optional().nullable(),

  // Distribution details
  distributed_by: z.string().optional().nullable(),
  distributed_at: z.string().optional().nullable(),

  // For tracking
  notes: z.string().optional().nullable(),

  // Metadata
  created_by: z.string().optional().nullable(),
  updated_by: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

// Request Create Schema
export const RequestCreateSchema = RequestSchema.omit({
  _id: true,
  request_id: true,
  queue_number: true,
  queue_position: true,
  estimated_wait_time: true,
  status: true,
  approved_items: true,
  rejected_items: true,
  rejection_reason: true,
  processed_by: true,
  processed_at: true,
  approved_by: true,
  approved_at: true,
  distributed_by: true,
  distributed_at: true,
  created_by: true,
  updated_by: true,
}).extend({
  items: z.array(
    RequestItemSchema.omit({
      prescription_verified: true,
      verified_by: true,
      verified_at: true,
    }),
  ),
});

// Request Update Schema
export const RequestUpdateSchema = RequestSchema.partial().omit({
  _id: true,
  request_id: true,
  requester_id: true,
  created_by: true,
});

// Request Queue View Schema
export const RequestQueueSchema = RequestSchema.pick({
  request_id: true,
  requester_name: true,
  requester_barangay: true,
  queue_number: true,
  queue_position: true,
  priority: true,
  status: true,
  created_at: true,
  estimated_wait_time: true,
}).extend({
  items_count: z.number(),
  total_items: z.number(),
  wait_time_display: z.string().optional(),
});

// Request Public Schema
export const RequestPublicSchema = RequestSchema.omit({
  prescription_images: true,
}).extend({
  can_be_processed: z.boolean().optional(),
  wait_time_display: z.string().optional(),
});

// Queue Statistics Schema
export const QueueStatisticsSchema = z.object({
  totalInQueue: z.number(),
  emergencyCount: z.number(),
  highPriorityCount: z.number(),
  averageWaitTime: z.number(),
  byBarangay: z.array(
    z.object({
      _id: z.string(),
      count: z.number(),
    }),
  ),
});

// ============ TYPES ============
export type Request = z.infer<typeof RequestSchema>;
export type RequestCreate = z.infer<typeof RequestCreateSchema>;
export type RequestUpdate = z.infer<typeof RequestUpdateSchema>;
export type RequestQueue = z.infer<typeof RequestQueueSchema>;
export type RequestPublic = z.infer<typeof RequestPublicSchema>;
export type RequestItem = z.infer<typeof RequestItemSchema>;
export type ApprovedItem = z.infer<typeof ApprovedItemSchema>;
export type RejectedItem = z.infer<typeof RejectedItemSchema>;
export type QueueStatistics = z.infer<typeof QueueStatisticsSchema>;

// ============ INTERFACES ============
export interface IRequest {
  request_id: string;
  requester_id: string;
  requester_name: string;
  requester_barangay: string;
  requester_contact?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    requires_prescription: boolean;
    prescription_image_url?: string | null;
    prescription_verified: boolean;
    verified_by?: string | null;
    verified_at?: string | null;
    notes?: string | null;
  }>;
  purpose?: string;
  queue_number?: number;
  queue_position: number;
  estimated_wait_time?: number | null;
  status:
    | "Pending"
    | "In Queue"
    | "Processing"
    | "Approved"
    | "Partially Approved"
    | "Rejected"
    | "Ready for Pickup"
    | "Completed"
    | "Cancelled";
  priority: "Emergency" | "High" | "Normal" | "Low";
  is_emergency: boolean;
  emergency_notes?: string | null;
  has_prescription: boolean;
  prescription_images?: string[];
  approved_items?: Array<{ item_id: string; quantity_approved: number }>;
  rejected_items?: Array<{ item_id: string; reason: string }>;
  rejection_reason?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  distributed_by?: string | null;
  distributed_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
