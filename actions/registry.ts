"use server";

import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { sanitizeUserForPublic } from "@/models/User";

export async function getUsers() {
  try {
    await connectToDatabase();

    const users = await UserModel.find({})
      .sort({ created_at: -1 })
      .lean()
      .exec();

    const sanitizedUsers = users.map((user) => sanitizeUserForPublic(user));

    return {
      success: true,
      data: sanitizedUsers,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
    };
  }
}

export async function getUserById(userId: string) {
  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ user_id: userId }).lean().exec();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const sanitizedUser = sanitizeUserForPublic(user);

    return {
      success: true,
      data: sanitizedUser,
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user",
    };
  }
}

export async function updateUserStatus(userId: string, status: string) {
  try {
    await connectToDatabase();

    const user = await UserModel.findOneAndUpdate(
      { user_id: userId },
      { status },
      { new: true },
    ).lean();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const sanitizedUser = sanitizeUserForPublic(user);

    return {
      success: true,
      data: sanitizedUser,
    };
  } catch (error) {
    console.error("Error updating user status:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update user status",
    };
  }
}
