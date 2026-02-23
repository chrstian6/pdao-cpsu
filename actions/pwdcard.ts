"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import PWDCardModel from "@/models/pwdCard";
import { Types } from "mongoose";

interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

/**
 * Helper function to check if string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Get PWD card by user ID (using user_id field in PDAO-YYYYMMDD-RANDOM format)
 */
export async function getPWDCardByUserId(
  userId: string,
): Promise<ActionResponse> {
  try {
    await connectToDatabase();

    // First find the user by their user_id to get the MongoDB _id
    const user = await UserModel.findOne({ user_id: userId })
      .select("_id")
      .lean();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Find the PWD card using the user's MongoDB _id
    const pwdCard = await PWDCardModel.findOne({
      user_id: user._id,
    }).lean();

    if (!pwdCard) {
      return { success: false, error: "No PWD card found for this user" };
    }

    // Convert MongoDB ObjectIds to strings
    const formattedCard = {
      ...pwdCard,
      _id: pwdCard._id.toString(),
      user_id: pwdCard.user_id.toString(),
      dateOfBirth: pwdCard.dateOfBirth.toISOString().split("T")[0],
      issuedDate: pwdCard.issuedDate.toISOString().split("T")[0],
      expiryDate: pwdCard.expiryDate.toISOString().split("T")[0],
      createdAt: pwdCard.createdAt?.toISOString(),
      updatedAt: pwdCard.updatedAt?.toISOString(),
    };

    return {
      success: true,
      data: formattedCard,
    };
  } catch (error) {
    console.error("Error fetching PWD card:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch PWD card",
    };
  }
}
