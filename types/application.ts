import { z } from "zod";
import {
  sexEnum,
  civilStatusEnum,
  disabilityTypeEnum,
  disabilityCauseEnum,
  educationalAttainmentEnum,
  employmentStatusEnum,
  occupationEnum,
  employmentCategoryEnum,
  accomplishedByEnum,
} from "./form";

// Define application status enum with new values (export for reuse)
export const applicationStatusEnum = [
  "pending",
  "approved",
  "cancelled",
  "renew",
  "rejected",
  "unverified",
  "verified",
] as const;

// Client-side validation schema (no Mongoose)
export const PwdApplicationClientSchema = z.object({
  applicationType: z.object({
    isNewApplicant: z.boolean(),
    isRenewal: z.boolean(),
  }),
  dateApplied: z.string().or(z.date()),
  personalInfo: z.object({
    lastName: z.string().min(1, "Last name is required"),
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional(),
    suffix: z.string().optional(),
    dateOfBirth: z.string().or(z.date()),
    sex: z.enum(sexEnum),
    civilStatus: z.enum(civilStatusEnum),
  }),
  disabilityInfo: z.object({
    types: z
      .array(z.enum(disabilityTypeEnum))
      .min(1, "At least one disability type must be selected"),
    causes: z
      .array(z.enum(disabilityCauseEnum))
      .min(1, "At least one cause must be selected"),
  }),
  address: z.object({
    houseNoStreet: z.string().min(1, "House number and street is required"),
    barangay: z.string().min(1, "Barangay is required"),
    municipality: z.string().min(1, "Municipality is required"),
    province: z.string().min(1, "Province is required"),
    region: z.string().min(1, "Region is required"),
  }),
  contactDetails: z.object({
    landlineNo: z.string().optional(),
    mobileNo: z
      .string()
      .regex(/^(\+63|0)\d{10}$/, "Invalid mobile number format")
      .optional(),
    emailAddress: z.string().email("Invalid email address").optional(),
  }),
  educationalAttainment: z.array(z.enum(educationalAttainmentEnum)),
  employmentStatus: z.array(z.enum(employmentStatusEnum)),
  occupation: z.object({
    types: z.array(z.enum(occupationEnum)),
    otherSpecify: z.string().optional(),
  }),
  employmentCategory: z.array(z.enum(employmentCategoryEnum)).optional(),
  organizationInfo: z
    .array(
      z.object({
        organizationAffiliated: z.string(),
        contactPerson: z.string(),
        officeAddress: z.string(),
        telNos: z.string(),
      }),
    )
    .optional(),
  idReferences: z.object({
    sssNo: z.string().optional(),
    pagIbigNo: z.string().optional(),
    psnNo: z.string().optional(),
    philHealthNo: z.string().optional(),
  }),
  // Family Background - Updated to have separate name fields
  familyBackground: z.object({
    father: z
      .object({
        lastName: z.string().optional(),
        firstName: z.string().optional(),
        middleName: z.string().optional(),
      })
      .optional(),
    mother: z
      .object({
        lastName: z.string().optional(),
        firstName: z.string().optional(),
        middleName: z.string().optional(),
      })
      .optional(),
    guardian: z
      .object({
        lastName: z.string().optional(),
        firstName: z.string().optional(),
        middleName: z.string().optional(),
      })
      .optional(),
  }),
  accomplishedBy: z.object({
    type: z.enum(accomplishedByEnum),
    certifyingPhysician: z.string().optional(),
    licenseNo: z.string().optional(),
  }),
  processingInfo: z.object({
    processingOfficer: z.string(),
    approvingOfficer: z.string(),
    encoder: z.string(),
    reportingUnit: z.string(),
  }),
  // Status field with new values (optional for client-side, will be set server-side)
  status: z.enum(applicationStatusEnum).optional(),
  controlNo: z.string().optional(),
});

// Client-side type (inferred from schema)
export type PwdApplicationFormData = z.infer<typeof PwdApplicationClientSchema>;
