// actions/card.ts
"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { CardModel } from "@/models/Card";
import { CardCreateSchema, CardUpdateSchema } from "@/types/card";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/actions/auth";

// ============ CREATE CARD ============
export async function createCard(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await connectToDatabase();

    const cardData = {
      card_id: formData.get("card_id") as string,
      user_id: (formData.get("user_id") as string) || `USER-${Date.now()}`,
      name: formData.get("name") as string,
      barangay: formData.get("barangay") as string,
      type_of_disability: formData.get("type_of_disability") as any,
      address: formData.get("address") as string,
      date_of_birth: new Date(formData.get("date_of_birth") as string),
      sex: formData.get("sex") as any,
      blood_type: formData.get("blood_type") as any,
      date_issued: new Date(
        (formData.get("date_issued") as string) || Date.now(),
      ),
      emergency_contact_name: formData.get("emergency_contact_name") as string,
      emergency_contact_number: formData.get(
        "emergency_contact_number",
      ) as string,
    };

    // Upload ID image (front of card)
    let id_image_url = null;
    const idImageFile = formData.get("id_image") as File;
    if (idImageFile && idImageFile.size > 0) {
      const result = await uploadToSupabase(idImageFile, "cards/id");
      if (result.error)
        return { success: false, error: "Failed to upload ID image" };
      id_image_url = result.url;
    }

    // Upload ID back image
    let id_back_image_url = null;
    const idBackFile = formData.get("id_back_image") as File;
    if (idBackFile && idBackFile.size > 0) {
      const result = await uploadToSupabase(idBackFile, "cards/id-back");
      if (result.error)
        return { success: false, error: "Failed to upload ID back image" };
      id_back_image_url = result.url;
    }

    // Upload face image
    let face_image_url = null;
    const faceImageFile = formData.get("face_image") as File;
    if (faceImageFile && faceImageFile.size > 0) {
      const result = await uploadToSupabase(faceImageFile, "cards/face");
      if (result.error)
        return { success: false, error: "Failed to upload face image" };
      face_image_url = result.url;
    }

    // Parse face descriptors
    let face_descriptors = null;
    const descriptorsJson = formData.get("face_descriptors") as string;
    if (descriptorsJson) {
      try {
        face_descriptors = JSON.parse(descriptorsJson);
      } catch {}
    }

    // Parse extracted OCR data
    let extracted_data = null;
    const extractedJson = formData.get("extracted_data") as string;
    if (extractedJson) {
      try {
        extracted_data = JSON.parse(extractedJson);
      } catch {}
    }

    const validatedData = CardCreateSchema.parse(cardData);

    const newCard = new CardModel({
      ...validatedData,
      id_image_url,
      id_back_image_url,
      face_image_url,
      face_descriptors,
      extracted_data,
      created_by: user.admin_id,
      status: "Active",
    });

    await newCard.save();
    revalidatePath("/dashboard/face");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newCard)),
      message: "Card created successfully",
    };
  } catch (error) {
    console.error("Error creating card:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create card",
    };
  }
}

// ============ GET ALL CARDS ============
export async function getCards() {
  try {
    await connectToDatabase();
    const cards = await CardModel.find({}).sort({ created_at: -1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(cards)) };
  } catch (error) {
    console.error("Error fetching cards:", error);
    return { success: false, error: "Failed to fetch cards" };
  }
}

// ============ GET CARD BY ID ============
export async function getCard(cardId: string) {
  try {
    await connectToDatabase();
    const card = await CardModel.findOne({ card_id: cardId }).lean();
    if (!card) return { success: false, error: "Card not found" };
    return { success: true, data: JSON.parse(JSON.stringify(card)) };
  } catch (error) {
    return { success: false, error: "Failed to fetch card" };
  }
}

// ============ GET CARD BY USER ID ============
export async function getCardByUserId(userId: string) {
  try {
    await connectToDatabase();
    const card = await CardModel.findOne({ user_id: userId }).lean();
    if (!card) return { success: false, error: "Card not found" };
    return { success: true, data: JSON.parse(JSON.stringify(card)) };
  } catch (error) {
    return { success: false, error: "Failed to fetch card by user ID" };
  }
}

// ============ VERIFY FACE ============
export async function verifyFace(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await connectToDatabase();

    const cardId = formData.get("card_id") as string;
    const descriptorsJson = formData.get("face_descriptors") as string;

    if (!cardId || !descriptorsJson) {
      return {
        success: false,
        error: "Card ID and face descriptors are required",
      };
    }

    const card = await CardModel.findOne({ card_id: cardId });
    if (!card) return { success: false, error: "Card not found" };

    if (!card.face_descriptors || card.face_descriptors.length === 0) {
      return {
        success: false,
        error: "No face data found for this card. Please register face first.",
      };
    }

    const incomingDescriptors = JSON.parse(descriptorsJson);
    const distance = calculateEuclideanDistance(
      card.face_descriptors,
      incomingDescriptors,
    );

    // Stricter threshold for ID verification
    const threshold = 0.55;
    const isMatch = distance < threshold;
    const matchScore = Math.max(0, Math.min(1, 1 - distance));

    // Update verification stats
    card.last_verified_at = new Date();
    card.verification_count = (card.verification_count || 0) + 1;
    await card.save();

    if (isMatch) {
      return {
        success: true,
        message: "Face verification successful!",
        data: {
          match_score: matchScore,
          distance,
          verified_at: new Date(),
          card: JSON.parse(JSON.stringify(card)),
        },
      };
    } else {
      return {
        success: false,
        error: "Face verification failed. Face does not match.",
        data: { match_score: matchScore, distance, verified_at: new Date() },
      };
    }
  } catch (error) {
    console.error("Error verifying face:", error);
    return { success: false, error: "Failed to verify face" };
  }
}

// ============ REGISTER FACE ============
export async function registerFace(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await connectToDatabase();

    const cardId = formData.get("card_id") as string;
    const descriptorsJson = formData.get("face_descriptors") as string;
    const faceImageFile = formData.get("face_image") as File;

    if (!cardId || !descriptorsJson || !faceImageFile) {
      return {
        success: false,
        error: "Card ID, face descriptors, and face image are required",
      };
    }

    const card = await CardModel.findOne({ card_id: cardId });
    if (!card) return { success: false, error: "Card not found" };

    const result = await uploadToSupabase(faceImageFile, "cards/face");
    if (result.error)
      return { success: false, error: "Failed to upload face image" };

    card.face_image_url = result.url;
    card.face_descriptors = JSON.parse(descriptorsJson);
    card.updated_by = user.admin_id;
    await card.save();

    return {
      success: true,
      message: "Face registered successfully",
      data: { face_image_url: result.url },
    };
  } catch (error) {
    console.error("Error registering face:", error);
    return { success: false, error: "Failed to register face" };
  }
}

// ============ UPDATE CARD ============
export async function updateCard(cardId: string, formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await connectToDatabase();

    const existingCard = await CardModel.findOne({ card_id: cardId });
    if (!existingCard) return { success: false, error: "Card not found" };

    const updateData: any = {};
    const fields = [
      "name",
      "barangay",
      "type_of_disability",
      "address",
      "date_of_birth",
      "sex",
      "blood_type",
      "date_issued",
      "emergency_contact_name",
      "emergency_contact_number",
      "status",
    ];

    fields.forEach((field) => {
      const value = formData.get(field);
      if (value) {
        updateData[field] = field.includes("date")
          ? new Date(value as string)
          : value;
      }
    });

    updateData.updated_by = user.admin_id;
    Object.assign(existingCard, updateData);
    await existingCard.save();

    revalidatePath("/dashboard/face");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(existingCard)),
      message: "Card updated successfully",
    };
  } catch (error) {
    console.error("Error updating card:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update card",
    };
  }
}

// ============ DELETE CARD ============
export async function deleteCard(cardId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    await connectToDatabase();

    const card = await CardModel.findOne({ card_id: cardId });
    if (!card) return { success: false, error: "Card not found" };

    // Delete all associated images
    for (const urlField of [
      "id_image_url",
      "id_back_image_url",
      "face_image_url",
    ] as const) {
      if (card[urlField]) {
        try {
          const url = new URL(card[urlField]);
          const pathMatch = url.pathname.match(/\/Cards\/(.+)$/);
          if (pathMatch?.[1]) {
            await supabaseAdmin.storage.from("Cards").remove([pathMatch[1]]);
          }
        } catch {}
      }
    }

    await CardModel.deleteOne({ card_id: cardId });
    revalidatePath("/dashboard/face");

    return { success: true, message: "Card deleted successfully" };
  } catch (error) {
    console.error("Error deleting card:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete card",
    };
  }
}

// ============ HELPER: Upload to Supabase ============
async function uploadToSupabase(
  file: File,
  folder: string,
): Promise<{ url: string; error: null } | { url: null; error: Error }> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("Cards")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("Cards").getPublicUrl(filePath);
    return { url: publicUrl, error: null };
  } catch (err) {
    console.error("Upload error:", err);
    return { url: null, error: err as Error };
  }
}

// ============ HELPER: Euclidean distance ============
function calculateEuclideanDistance(
  descriptor1: number[],
  descriptor2: number[],
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error("Face descriptors must have the same length");
  }
  return Math.sqrt(
    descriptor1.reduce((sum, val, i) => {
      const diff = val - descriptor2[i];
      return sum + diff * diff;
    }, 0),
  );
}
