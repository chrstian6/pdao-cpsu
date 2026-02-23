"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { PwdApplication, PwdApplicationSchema } from "@/models/PwdApplication";
import { applicationStatusEnum } from "@/types/application";
import { Types } from "mongoose";
import { z } from "zod";

interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

// Define a type for the form data
interface PwdApplicationFormInput {
  formId?: string;
  applicationType: {
    isNewApplicant: boolean;
    isRenewal: boolean;
  };
  personsWithDisabilityNumber?: string;
  dateApplied: string | Date;
  personalInfo: {
    lastName: string;
    firstName: string;
    middleName?: string;
    suffix?: string;
    dateOfBirth: string | Date;
    sex: string;
    civilStatus: string;
  };
  disabilityInfo: {
    types: string[];
    causes: string[];
  };
  address: {
    houseNoStreet: string;
    barangay: string;
    municipality: string;
    province: string;
    region: string;
  };
  contactDetails: {
    landlineNo?: string;
    mobileNo?: string;
    emailAddress?: string;
  };
  educationalAttainment: string[];
  employmentStatus: string[];
  occupation: {
    types: string[];
    otherSpecify?: string;
  };
  employmentCategory?: string[];
  organizationInfo?: any[];
  idReferences?: {
    sssNo?: string;
    pagIbigNo?: string;
    psnNo?: string;
    philHealthNo?: string;
  };
  familyBackground?: {
    father?: {
      lastName?: string;
      firstName?: string;
      middleName?: string;
    };
    mother?: {
      lastName?: string;
      firstName?: string;
      middleName?: string;
    };
    guardian?: {
      lastName?: string;
      firstName?: string;
      middleName?: string;
    };
  };
  accomplishedBy: {
    type: string;
    certifyingPhysician?: string;
    licenseNo?: string;
  };
  processingInfo: {
    processingOfficer: string;
    approvingOfficer: string;
    encoder: string;
    reportingUnit: string;
  };
  status?: string;
  controlNo?: string;
}

/**
 * Helper function to check if string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Helper function to calculate age
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Helper function to parse date from various formats
 */
function parseDate(dateValue: string | Date): Date {
  if (dateValue instanceof Date) return dateValue;

  // Try to parse the date - it could be in YYYY-MM-DD or MM/DD/YYYY format
  let dateStr = dateValue;

  // If it's in MM/DD/YYYY format, convert to YYYY-MM-DD for reliable parsing
  if (dateStr.includes("/")) {
    const [month, day, year] = dateStr.split("/");
    dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateValue}`);
  }
  return date;
}

/**
 * Get PWD application by user ID
 */
export async function getPwdApplicationByUserId(
  userId: string,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    // Find by user_id directly (PDAO-YYYYMMDD-RANDOM format)
    const application = await PwdApplication.findOne({ userId }).lean();

    if (!application) {
      return { success: false, error: "No application found" };
    }

    // Convert MongoDB ObjectIds to strings
    const formattedApplication = {
      ...application,
      _id: application._id.toString(),
      dateApplied: application.dateApplied.toISOString().split("T")[0],
      personalInfo: {
        ...application.personalInfo,
        dateOfBirth: application.personalInfo.dateOfBirth
          .toISOString()
          .split("T")[0],
      },
      createdAt: application.createdAt?.toISOString(),
      updatedAt: application.updatedAt?.toISOString(),
    };

    return {
      success: true,
      data: formattedApplication,
    };
  } catch (error) {
    console.error("Error fetching application:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch application",
    };
  }
}

/**
 * Create PWD application only (no card created)
 */
export async function createPwdApplication(
  userId: string,
  formData: PwdApplicationFormInput,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    console.log("Looking for user with user_id:", userId);

    // Find the user by user_id directly (PDAO-YYYYMMDD-RANDOM format)
    const user = await UserModel.findOne({ user_id: userId });

    if (!user) {
      console.error("User not found with user_id:", userId);
      return { success: false, error: "User not found" };
    }

    console.log("User found:", user._id, user.user_id);

    // Check if user already has a PWD application
    const existingApplication = await PwdApplication.findOne({
      userId: user.user_id,
    });

    if (existingApplication) {
      console.log("Existing application found for user:", user.user_id);
      return { success: false, error: "User already has a PWD application" };
    }

    console.log("Processing form data...");

    // Pre-process the form data to convert date strings to proper format
    const dateApplied = parseDate(formData.dateApplied);
    const dateOfBirth = parseDate(formData.personalInfo.dateOfBirth);

    console.log("Dates parsed:", { dateApplied, dateOfBirth });

    // Prepare the data for database insertion - match the schema exactly
    const applicationData = {
      userId: user.user_id,
      formId: formData.formId || `FORM-${Date.now()}`,
      applicationType: {
        isNewApplicant: formData.applicationType?.isNewApplicant ?? false,
        isRenewal: formData.applicationType?.isRenewal ?? false,
      },
      personsWithDisabilityNumber:
        formData.personsWithDisabilityNumber || undefined,
      dateApplied: dateApplied,
      personalInfo: {
        lastName: formData.personalInfo?.lastName ?? "",
        firstName: formData.personalInfo?.firstName ?? "",
        middleName: formData.personalInfo?.middleName || "",
        suffix: formData.personalInfo?.suffix || "",
        dateOfBirth: dateOfBirth,
        sex: formData.personalInfo?.sex ?? "",
        civilStatus: formData.personalInfo?.civilStatus ?? "",
      },
      disabilityInfo: {
        types: formData.disabilityInfo?.types || [],
        causes: formData.disabilityInfo?.causes || [],
      },
      address: {
        houseNoStreet: formData.address?.houseNoStreet ?? "",
        barangay: formData.address?.barangay ?? "",
        municipality: formData.address?.municipality ?? "",
        province: formData.address?.province ?? "",
        region: formData.address?.region ?? "",
      },
      contactDetails: {
        landlineNo: formData.contactDetails?.landlineNo || "",
        mobileNo: formData.contactDetails?.mobileNo || "",
        emailAddress: formData.contactDetails?.emailAddress || "",
      },
      educationalAttainment: formData.educationalAttainment || [],
      employmentStatus: formData.employmentStatus || [],
      occupation: {
        types: formData.occupation?.types || [],
        otherSpecify: formData.occupation?.otherSpecify || "",
      },
      employmentCategory: formData.employmentCategory || [],
      organizationInfo: formData.organizationInfo || [],
      idReferences: {
        sssNo: formData.idReferences?.sssNo || "",
        pagIbigNo: formData.idReferences?.pagIbigNo || "",
        psnNo: formData.idReferences?.psnNo || "",
        philHealthNo: formData.idReferences?.philHealthNo || "",
      },
      // Updated family background structure
      familyBackground: {
        father: {
          lastName: formData.familyBackground?.father?.lastName || "",
          firstName: formData.familyBackground?.father?.firstName || "",
          middleName: formData.familyBackground?.father?.middleName || "",
        },
        mother: {
          lastName: formData.familyBackground?.mother?.lastName || "",
          firstName: formData.familyBackground?.mother?.firstName || "",
          middleName: formData.familyBackground?.mother?.middleName || "",
        },
        guardian: {
          lastName: formData.familyBackground?.guardian?.lastName || "",
          firstName: formData.familyBackground?.guardian?.firstName || "",
          middleName: formData.familyBackground?.guardian?.middleName || "",
        },
      },
      accomplishedBy: {
        type: formData.accomplishedBy?.type || "APPLICANT",
        certifyingPhysician: formData.accomplishedBy?.certifyingPhysician || "",
        licenseNo: formData.accomplishedBy?.licenseNo || "",
      },
      processingInfo: {
        processingOfficer:
          formData.processingInfo?.processingOfficer ||
          "DELA CRUZ ANYA GUANZON",
        approvingOfficer:
          formData.processingInfo?.approvingOfficer ||
          "GATILAO MAUREEN JOHANNA GARCIA",
        encoder: formData.processingInfo?.encoder || "MONTES REYMARK TACGA",
        reportingUnit: formData.processingInfo?.reportingUnit || "PDAO",
      },
      // Set status - default to "pending" (must match enum values)
      status: formData.status || "pending",
      controlNo: formData.controlNo || undefined,
    };

    console.log("Application data prepared, validating with Zod...");
    console.log("Application Status:", applicationData.status);

    // Validate with Zod first
    const validatedData = PwdApplicationSchema.parse(applicationData);

    console.log("Zod validation passed, saving to database...");

    // Save the application data to PwdApplication collection
    const application = await PwdApplication.create(validatedData);

    console.log("Application saved successfully with ID:", application._id);
    console.log("Application status:", application.status);

    // Update user with form_id (but NOT verified)
    user.form_id = formData.formId || `FORM-${Date.now()}`;
    user.updated_at = new Date();
    await user.save();

    console.log("User updated with form_id:", user.form_id);

    revalidatePath("/registry");
    revalidatePath(`/registry/${userId}`);

    return {
      success: true,
      message:
        "PWD application submitted successfully. The card will be issued after verification.",
      data: {
        application: {
          ...application.toObject(),
          _id: application._id.toString(),
        },
      },
    };
  } catch (error) {
    console.error("Error creating PWD application:", error);

    // Check if error is a ZodError
    if (error instanceof z.ZodError) {
      console.error("Zod validation errors:", error.issues);
      return {
        success: false,
        error:
          "Validation failed: " +
          error.issues
            .map((e: any) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
      };
    }

    // Check if error is a Mongoose validation error
    if (error && typeof error === "object" && "errors" in error) {
      console.error("Mongoose validation errors:", (error as any).errors);
      const errorMessages = Object.values((error as any).errors)
        .map((err: any) => err.message)
        .join(", ");
      return {
        success: false,
        error: `Database validation failed: ${errorMessages}`,
      };
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create PWD application";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update PWD application
 */
export async function updatePwdApplication(
  applicationId: string,
  formData: PwdApplicationFormInput,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    // Find the application
    const application = await PwdApplication.findById(applicationId);
    if (!application) {
      return { success: false, error: "Application not found" };
    }

    // Pre-process the form data to convert date strings to proper format
    const dateApplied = parseDate(formData.dateApplied);
    const dateOfBirth = parseDate(formData.personalInfo.dateOfBirth);

    // Update application fields
    application.set({
      ...formData,
      dateApplied: dateApplied,
      personalInfo: {
        ...formData.personalInfo,
        dateOfBirth: dateOfBirth,
      },
      // Updated family background structure
      familyBackground: {
        father: {
          lastName: formData.familyBackground?.father?.lastName || "",
          firstName: formData.familyBackground?.father?.firstName || "",
          middleName: formData.familyBackground?.father?.middleName || "",
        },
        mother: {
          lastName: formData.familyBackground?.mother?.lastName || "",
          firstName: formData.familyBackground?.mother?.firstName || "",
          middleName: formData.familyBackground?.mother?.middleName || "",
        },
        guardian: {
          lastName: formData.familyBackground?.guardian?.lastName || "",
          firstName: formData.familyBackground?.guardian?.firstName || "",
          middleName: formData.familyBackground?.guardian?.middleName || "",
        },
      },
      accomplishedBy: {
        type: formData.accomplishedBy?.type || "APPLICANT",
        certifyingPhysician: formData.accomplishedBy?.certifyingPhysician || "",
        licenseNo: formData.accomplishedBy?.licenseNo || "",
      },
      // Update status if provided
      status: formData.status || application.status,
      controlNo: formData.controlNo || undefined,
      updatedAt: new Date(),
    });

    await application.save();

    revalidatePath("/registry");
    revalidatePath(`/registry/${application.userId}`);

    return {
      success: true,
      message: "PWD application updated successfully",
    };
  } catch (error) {
    console.error("Error updating PWD application:", error);

    // Check if error is a ZodError
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error:
          "Validation failed: " +
          error.issues.map((e: any) => e.message).join(", "),
      };
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update PWD application";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update application status only
 * This function is exported and can be used to update just the status of an application
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: (typeof applicationStatusEnum)[number],
  remarks?: string,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    const application = await PwdApplication.findById(applicationId);

    if (!application) {
      return { success: false, error: "Application not found" };
    }

    application.status = status;
    application.updatedAt = new Date();

    // You can add a remarks field if needed in the future
    // application.statusRemarks = remarks;

    await application.save();

    revalidatePath("/registry");
    revalidatePath(`/registry/${application.userId}`);

    return {
      success: true,
      message: `Application status updated to ${status}`,
      data: {
        applicationId: application._id.toString(),
        status: application.status,
      },
    };
  } catch (error) {
    console.error("Error updating application status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Get applications by status
 */
export async function getApplicationsByStatus(
  status: (typeof applicationStatusEnum)[number],
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    const applications = await PwdApplication.find({ status })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const formattedApplications = applications.map((app) => ({
      ...app,
      _id: app._id.toString(),
      dateApplied: app.dateApplied.toISOString().split("T")[0],
      personalInfo: {
        ...app.personalInfo,
        dateOfBirth: app.personalInfo.dateOfBirth.toISOString().split("T")[0],
      },
      createdAt: app.createdAt?.toISOString(),
      updatedAt: app.updatedAt?.toISOString(),
    }));

    return {
      success: true,
      data: formattedApplications,
    };
  } catch (error) {
    console.error("Error fetching applications by status:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch applications",
    };
  }
}

/**
 * Get all applications with optional filters
 */
export async function getApplications(filters?: {
  status?: string;
  userId?: string;
}): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    let query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.userId) {
      query.userId = filters.userId;
    }

    const applications = await PwdApplication.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const formattedApplications = applications.map((app) => ({
      ...app,
      _id: app._id.toString(),
      dateApplied: app.dateApplied.toISOString().split("T")[0],
      personalInfo: {
        ...app.personalInfo,
        dateOfBirth: app.personalInfo.dateOfBirth.toISOString().split("T")[0],
      },
      createdAt: app.createdAt?.toISOString(),
      updatedAt: app.updatedAt?.toISOString(),
    }));

    return {
      success: true,
      data: formattedApplications,
    };
  } catch (error) {
    console.error("Error fetching applications:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch applications",
    };
  }
}

/**
 * Delete an application (admin only)
 */
export async function deleteApplication(
  applicationId: string,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    const application = await PwdApplication.findByIdAndDelete(applicationId);

    if (!application) {
      return { success: false, error: "Application not found" };
    }

    revalidatePath("/registry");

    return {
      success: true,
      message: "Application deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting application:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete application",
    };
  }
}

/**
 * Check if user has an application
 */
export async function hasUserApplication(
  userId: string,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    const application = await PwdApplication.findOne({ userId }).lean();

    return {
      success: true,
      data: {
        hasApplication: !!application,
        applicationId: application?._id.toString(),
      },
    };
  } catch (error) {
    console.error("Error checking user application:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check application",
    };
  }
}

/**
 * Get application statistics
 */
export async function getApplicationStatistics(): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    const total = await PwdApplication.countDocuments();
    const pending = await PwdApplication.countDocuments({
      status: "pending",
    });
    const approved = await PwdApplication.countDocuments({
      status: "approved",
    });
    const cancelled = await PwdApplication.countDocuments({
      status: "cancelled",
    });
    const renew = await PwdApplication.countDocuments({
      status: "renew",
    });
    const rejected = await PwdApplication.countDocuments({
      status: "rejected",
    });
    const unverified = await PwdApplication.countDocuments({
      status: "unverified",
    });
    const verified = await PwdApplication.countDocuments({
      status: "verified",
    });

    return {
      success: true,
      data: {
        total,
        pending,
        approved,
        cancelled,
        renew,
        rejected,
        unverified,
        verified,
      },
    };
  } catch (error) {
    console.error("Error fetching application statistics:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch statistics",
    };
  }
}
