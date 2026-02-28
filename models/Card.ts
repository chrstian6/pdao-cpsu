// models/Card.ts
import mongoose, { Document, Schema } from "mongoose";
import { ICard } from "@/types/card";

// ============ MONGOOSE DOCUMENT INTERFACE ============
export interface ICardDocument extends ICard, Document {
  getAge(): number;
  isExpired(): boolean;
}

// ============ MONGOOSE SCHEMA ============
const CardMongooseSchema = new Schema<ICardDocument>(
  {
    card_id: {
      type: String,
      required: [true, "Card ID is required"],
      unique: true,
      index: true,
      match: [
        /^\d{2}-\d{4}-\d{3}-\d{7}$/,
        "Card ID must follow format: 06-4511-000-0000000",
      ],
    },

    user_id: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    barangay: {
      type: String,
      required: [true, "Barangay is required"],
      trim: true,
    },

    type_of_disability: {
      type: String,
      required: [true, "Type of disability is required"],
      enum: [
        "Physical Disability",
        "Visual Impairment",
        "Hearing Impairment",
        "Speech Impairment",
        "Intellectual Disability",
        "Learning Disability",
        "Mental Disability",
        "Multiple Disabilities",
        "Others",
      ],
    },

    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },

    date_of_birth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },

    sex: {
      type: String,
      required: [true, "Sex is required"],
      enum: ["Male", "Female", "Other"],
    },

    blood_type: {
      type: String,
      required: [true, "Blood type is required"],
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
    },

    date_issued: {
      type: Date,
      required: [true, "Date issued is required"],
      default: Date.now,
    },

    emergency_contact_name: {
      type: String,
      required: [true, "Emergency contact name is required"],
      trim: true,
    },

    emergency_contact_number: {
      type: String,
      required: [true, "Emergency contact number is required"],
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Expired", "Revoked", "Pending"],
      default: "Active",
      index: true,
    },

    // Face verification data
    face_image_url: {
      type: String,
      default: null,
    },

    face_descriptors: {
      type: [Number],
      default: null,
    },

    id_image_url: {
      type: String,
      default: null,
    },

    extracted_data: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Metadata
    created_by: {
      type: String,
      default: null,
    },

    updated_by: {
      type: String,
      default: null,
    },

    last_verified_at: {
      type: Date,
      default: null,
    },

    verification_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// ============ INDEXES ============
CardMongooseSchema.index({ card_id: 1 }, { unique: true });
CardMongooseSchema.index({ user_id: 1 });
CardMongooseSchema.index({ status: 1 });
CardMongooseSchema.index({ name: "text", address: "text", barangay: "text" });

// ============ METHODS ============

/**
 * Calculate age from date of birth
 */
CardMongooseSchema.methods.getAge = function (): number {
  const doc = this as ICardDocument;
  const today = new Date();
  const birthDate = new Date(doc.date_of_birth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Check if card is expired (5 years validity)
 */
CardMongooseSchema.methods.isExpired = function (): boolean {
  const doc = this as ICardDocument;
  const issuedDate = new Date(doc.date_issued);
  const expiryDate = new Date(issuedDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  return new Date() > expiryDate;
};

// ============ VIRTUAL PROPERTIES ============

CardMongooseSchema.virtual("age").get(function () {
  return this.getAge();
});

CardMongooseSchema.virtual("expiry_date").get(function () {
  const issuedDate = new Date(this.date_issued);
  const expiryDate = new Date(issuedDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  return expiryDate;
});

CardMongooseSchema.virtual("is_expired").get(function () {
  return this.isExpired();
});

CardMongooseSchema.virtual("formatted_date_of_birth").get(function () {
  return new Date(this.date_of_birth).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

CardMongooseSchema.virtual("formatted_date_issued").get(function () {
  return new Date(this.date_issued).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// ============ TRANSFORM JSON ============
CardMongooseSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete (ret as Record<string, any>).__v;
    delete (ret as Record<string, any>).face_descriptors; // Don't expose face descriptors
    return ret;
  },
});

CardMongooseSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete (ret as Record<string, any>).__v;
    delete (ret as Record<string, any>).face_descriptors;
    return ret;
  },
});

// ============ MODEL ============
if (mongoose.models.Card) {
  delete mongoose.models.Card;
}

export const CardModel =
  mongoose.models.Card ||
  mongoose.model<ICardDocument>("Card", CardMongooseSchema);
