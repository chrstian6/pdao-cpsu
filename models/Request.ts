import mongoose, { Document, Schema } from "mongoose";
import { IRequest } from "@/types/request";

// ============ MONGOOSE DOCUMENT INTERFACE ============
export interface IRequestDocument extends IRequest, Document {
  calculateWaitTime(): number;
  updateQueuePosition(position: number): Promise<void>;
  approve(
    approvedBy: string,
    approvedItems?: Array<{ item_id: string; quantity: number }>,
  ): Promise<void>;
  reject(reason: string, rejectedBy: string): Promise<void>;
  distribute(distributedBy: string): Promise<void>;
}

// ============ MONGOOSE SCHEMA ============
const RequestMongooseSchema = new Schema<IRequestDocument>(
  {
    request_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    requester_id: {
      type: String,
      required: [true, "Requester ID is required"],
      ref: "User",
      index: true,
    },

    requester_name: {
      type: String,
      required: [true, "Requester name is required"],
    },

    requester_barangay: {
      type: String,
      required: [true, "Requester barangay is required"],
      index: true,
    },

    requester_contact: String,

    items: [
      {
        item_id: {
          type: String,
          required: true,
          ref: "Item",
        },
        item_name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unit: { type: String, required: true },
        requires_prescription: { type: Boolean, default: false },
        prescription_image_url: { type: String, default: null },
        prescription_verified: { type: Boolean, default: false },
        verified_by: { type: String, default: null },
        verified_at: { type: String, default: null },
        notes: { type: String, default: null },
      },
    ],

    purpose: String,

    queue_number: {
      type: Number,
      unique: true,
      sparse: true,
    },

    queue_position: {
      type: Number,
      default: 0,
      index: true,
    },

    estimated_wait_time: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "In Queue",
        "Processing",
        "Approved",
        "Partially Approved",
        "Rejected",
        "Ready for Pickup",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    priority: {
      type: String,
      enum: ["Emergency", "High", "Normal", "Low"],
      default: "Normal",
      index: true,
    },

    is_emergency: {
      type: Boolean,
      default: false,
    },

    emergency_notes: String,

    has_prescription: {
      type: Boolean,
      default: false,
    },

    prescription_images: [String],

    approved_items: [
      {
        item_id: String,
        quantity_approved: Number,
      },
    ],

    rejected_items: [
      {
        item_id: String,
        reason: String,
      },
    ],

    rejection_reason: String,

    processed_by: String,
    processed_at: String,

    approved_by: String,
    approved_at: String,

    distributed_by: String,
    distributed_at: String,

    notes: String,

    created_by: String,
    updated_by: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// ============ INDEXES ============
RequestMongooseSchema.index({ request_id: 1 }, { unique: true });
RequestMongooseSchema.index({ status: 1, queue_position: 1 });
RequestMongooseSchema.index({ status: 1, priority: 1, created_at: 1 });
RequestMongooseSchema.index({ requester_barangay: 1, status: 1 });
RequestMongooseSchema.index({ requester_id: 1, created_at: -1 });

// Compound index for queue ordering
RequestMongooseSchema.index({
  status: 1,
  priority: 1,
  queue_position: 1,
  created_at: 1,
});

// ============ MIDDLEWARE ============

// Generate sequential request_id before saving
RequestMongooseSchema.pre("save", async function (next) {
  const doc = this as IRequestDocument;

  if (doc.isNew || !doc.request_id || doc.request_id === "REQ-00000") {
    try {
      const lastRequest = await mongoose
        .model("Request")
        .findOne({}, { request_id: 1 }, { sort: { request_id: -1 } });

      let nextNumber = 1;
      if (lastRequest && lastRequest.request_id) {
        const lastNumber = parseInt(lastRequest.request_id.split("-")[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      const paddedNumber = String(nextNumber).padStart(5, "0");
      doc.request_id = `REQ-${paddedNumber}`;
    } catch (error) {
      console.error("Error generating request_id:", error);
      const timestamp = Date.now().toString().slice(-5);
      doc.request_id = `REQ-${timestamp}`;
    }
  }
});

// Set queue position when status changes to "In Queue"
RequestMongooseSchema.pre("save", async function (next) {
  const doc = this as IRequestDocument;

  if (
    doc.isModified("status") &&
    doc.status === "In Queue" &&
    !doc.queue_number
  ) {
    try {
      // Get the highest queue number
      const lastQueued = await mongoose
        .model("Request")
        .findOne(
          { status: "In Queue" },
          { queue_number: 1 },
          { sort: { queue_number: -1 } },
        );

      let nextQueueNumber = 1;
      if (lastQueued && lastQueued.queue_number) {
        nextQueueNumber = lastQueued.queue_number + 1;
      }

      doc.queue_number = nextQueueNumber;
      doc.queue_position = nextQueueNumber;

      // Calculate estimated wait time (5 mins per request in queue)
      const queueLength = await mongoose.model("Request").countDocuments({
        status: "In Queue",
        queue_number: { $lt: nextQueueNumber },
      });

      doc.estimated_wait_time = queueLength * 5; // 5 minutes per request
    } catch (error) {
      console.error("Error setting queue position:", error);
    }
  }
});

// ============ METHODS ============

/**
 * Calculate estimated wait time
 */
RequestMongooseSchema.methods.calculateWaitTime = function (): number {
  const doc = this as IRequestDocument;

  // Base wait time: 5 minutes per item
  const itemCount = doc.items.reduce((sum, item) => sum + item.quantity, 0);
  let waitTime = itemCount * 5;

  // Adjust based on priority
  switch (doc.priority) {
    case "Emergency":
      waitTime = Math.ceil(waitTime * 0.5); // 50% of normal time
      break;
    case "High":
      waitTime = Math.ceil(waitTime * 0.75); // 75% of normal time
      break;
    case "Low":
      waitTime = Math.ceil(waitTime * 1.5); // 150% of normal time
      break;
  }

  return waitTime;
};

/**
 * Update queue position
 */
RequestMongooseSchema.methods.updateQueuePosition = async function (
  position: number,
): Promise<void> {
  const doc = this as IRequestDocument;
  doc.queue_position = position;
  await doc.save();
};

/**
 * Approve request
 */
RequestMongooseSchema.methods.approve = async function (
  approvedBy: string,
  approvedItems?: Array<{ item_id: string; quantity: number }>,
): Promise<void> {
  const doc = this as IRequestDocument;

  if (approvedItems && approvedItems.length > 0) {
    // Partial approval
    doc.approved_items = approvedItems.map((item) => ({
      item_id: item.item_id,
      quantity_approved: item.quantity,
    }));
    doc.status = "Partially Approved";

    // Check for rejected items
    const requestedItemIds = doc.items.map((item) => item.item_id);
    const approvedItemIds = approvedItems.map((item) => item.item_id);
    const rejectedItemIds = requestedItemIds.filter(
      (id) => !approvedItemIds.includes(id),
    );

    doc.rejected_items = rejectedItemIds.map((id) => ({
      item_id: id,
      reason: "Item not available at this time",
    }));
  } else {
    // Full approval
    doc.approved_items = doc.items.map((item) => ({
      item_id: item.item_id,
      quantity_approved: item.quantity,
    }));
    doc.status = "Approved";
  }

  doc.approved_by = approvedBy;
  doc.approved_at = new Date().toISOString().split("T")[0];

  await doc.save();
};

/**
 * Reject request
 */
RequestMongooseSchema.methods.reject = async function (
  reason: string,
  rejectedBy: string,
): Promise<void> {
  const doc = this as IRequestDocument;

  doc.status = "Rejected";
  doc.rejection_reason = reason;
  doc.processed_by = rejectedBy;
  doc.processed_at = new Date().toISOString().split("T")[0];

  await doc.save();
};

/**
 * Mark as distributed
 */
RequestMongooseSchema.methods.distribute = async function (
  distributedBy: string,
): Promise<void> {
  const doc = this as IRequestDocument;

  doc.status = "Completed";
  doc.distributed_by = distributedBy;
  doc.distributed_at = new Date().toISOString().split("T")[0];

  await doc.save();
};

// ============ VIRTUAL PROPERTIES ============

RequestMongooseSchema.virtual("items_count").get(function () {
  return this.items.length;
});

RequestMongooseSchema.virtual("total_items").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

RequestMongooseSchema.virtual("can_be_processed").get(function () {
  return ["Pending", "In Queue"].includes(this.status);
});

RequestMongooseSchema.virtual("wait_time_display").get(function () {
  if (!this.estimated_wait_time) return "Unknown";

  const hours = Math.floor(this.estimated_wait_time / 60);
  const minutes = this.estimated_wait_time % 60;

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
  }
  return `${minutes} minutes`;
});

// ============ TRANSFORM JSON ============
RequestMongooseSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete (ret as any).__v;
    delete (ret as any).prescription_images;
    return ret;
  },
});

RequestMongooseSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete (ret as any).__v;
    delete (ret as any).prescription_images;
    return ret;
  },
});

// ============ MODEL ============
export const RequestModel =
  mongoose.models.Request ||
  mongoose.model<IRequestDocument>("Request", RequestMongooseSchema);
