"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { PwdApplication } from "@/models/PwdApplication";

// Define the possible application status values
export type ApplicationStatusType =
  | "none"
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "completed"
  | "verified"; // Add "verified" to the type

export type UserStatus = {
  userId: string;
  hasApplication: boolean;
  hasPwdId: boolean;
  hasCard: boolean;
  isVerified: boolean;
  applicationStatus: ApplicationStatusType;
  applicationStatusDetail?: string; // For more detailed status from the application
  cardStatus: "none" | "active" | "expired";
  canApply: boolean;
  canVerify: boolean;
  canRenew: boolean;
};

/**
 * Check application status for a single user
 */
export async function checkUserApplicationStatus(userId: string): Promise<{
  success: boolean;
  data?: UserStatus;
  error?: string;
}> {
  try {
    await connectToDatabase();

    // Find user
    const user = await UserModel.findOne({ user_id: userId }).lean();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Check if user has an application
    const application = await PwdApplication.findOne({ userId }).lean();

    // Determine statuses
    const hasApplication = !!application;
    const hasPwdId = !!user.pwd_issued_id;
    const hasCard = !!user.card_id;
    const isVerified = user.is_verified === true;

    // Application status
    let applicationStatus: ApplicationStatusType = "none";
    let applicationStatusDetail = application?.status;

    if (hasApplication) {
      if (isVerified) {
        applicationStatus = "verified"; // Use "verified" instead of "completed"
      } else {
        // Map the application status to our simplified status
        switch (application.status) {
          case "submitted":
            applicationStatus = "submitted";
            break;
          case "under_review":
            applicationStatus = "under_review";
            break;
          case "approved":
            applicationStatus = "approved";
            break;
          case "rejected":
            applicationStatus = "rejected";
            break;
          case "for_revision":
            applicationStatus = "pending";
            break;
          default:
            applicationStatus = "pending";
        }
      }
    }

    // Card status (simplified - you can add expiry check if needed)
    let cardStatus: "none" | "active" | "expired" = "none";
    if (hasCard) cardStatus = "active";

    // Available actions
    const canApply = !hasApplication && !isVerified && !hasPwdId;
    const canVerify = hasApplication && !isVerified;
    const canRenew = isVerified && hasCard;

    const status: UserStatus = {
      userId: user.user_id,
      hasApplication,
      hasPwdId,
      hasCard,
      isVerified,
      applicationStatus,
      applicationStatusDetail,
      cardStatus,
      canApply,
      canVerify,
      canRenew,
    };

    return {
      success: true,
      data: status,
    };
  } catch (error) {
    console.error("Error checking user status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check status",
    };
  }
}

/**
 * Check application status for multiple users (batch)
 */
export async function checkBatchApplicationStatus(userIds: string[]): Promise<{
  success: boolean;
  data?: Record<string, UserStatus>;
  error?: string;
}> {
  try {
    await connectToDatabase();

    const statusMap: Record<string, UserStatus> = {};

    // Process each user
    for (const userId of userIds) {
      const user = await UserModel.findOne({ user_id: userId }).lean();

      if (!user) continue;

      const application = await PwdApplication.findOne({ userId }).lean();

      const hasApplication = !!application;
      const hasPwdId = !!user.pwd_issued_id;
      const hasCard = !!user.card_id;
      const isVerified = user.is_verified === true;

      let applicationStatus: ApplicationStatusType = "none";
      let applicationStatusDetail = application?.status;

      if (hasApplication) {
        if (isVerified) {
          applicationStatus = "verified";
        } else {
          switch (application.status) {
            case "submitted":
              applicationStatus = "submitted";
              break;
            case "under_review":
              applicationStatus = "under_review";
              break;
            case "approved":
              applicationStatus = "approved";
              break;
            case "rejected":
              applicationStatus = "rejected";
              break;
            case "for_revision":
              applicationStatus = "pending";
              break;
            default:
              applicationStatus = "pending";
          }
        }
      }

      let cardStatus: "none" | "active" | "expired" = "none";
      if (hasCard) cardStatus = "active";

      const canApply = !hasApplication && !isVerified && !hasPwdId;
      const canVerify = hasApplication && !isVerified;
      const canRenew = isVerified && hasCard;

      statusMap[userId] = {
        userId: user.user_id,
        hasApplication,
        hasPwdId,
        hasCard,
        isVerified,
        applicationStatus,
        applicationStatusDetail,
        cardStatus,
        canApply,
        canVerify,
        canRenew,
      };
    }

    return {
      success: true,
      data: statusMap,
    };
  } catch (error) {
    console.error("Error checking batch status:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check statuses",
    };
  }
}
