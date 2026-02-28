// actions/item.ts
"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { ItemModel } from "@/models/Item";
import {
  ItemCreateSchema,
  ItemUpdateSchema,
  generateStockAlert,
} from "@/types/item";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/actions/auth";

// ============ CREATE ITEM ============
export async function createItem(formData: FormData) {
  try {
    // Get current user from auth
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Extract form data
    const itemData = {
      item_name: formData.get("item_name") as string,
      item_description: (formData.get("item_description") as string) || "",
      category: formData.get("category") as any,
      stock: parseInt(formData.get("stock") as string) || 0,
      unit: formData.get("unit") as any,
      location: (formData.get("location") as string) || "Main Storage",
      expiry_date: (formData.get("expiry_date") as string) || null,
      is_medical: formData.get("is_medical") === "true",
      requires_prescription: formData.get("requires_prescription") === "true",
      requires_med_cert: formData.get("requires_med_cert") === "true",
      requires_brgy_cert: formData.get("requires_brgy_cert") === "true",
      is_consumable: formData.get("is_consumable") !== "false",
      needs_fitting: formData.get("needs_fitting") === "true",
      size: (formData.get("size") as string) || null,
      brand: (formData.get("brand") as string) || null,
    };

    // Handle image upload if present
    let item_image_url = null;
    const imageFile = formData.get("item_image") as File;

    if (imageFile && imageFile.size > 0) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(imageFile.type)) {
        return {
          success: false,
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.",
        };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (imageFile.size > maxSize) {
        return {
          success: false,
          error: "File size too large. Maximum size is 5MB.",
        };
      }

      // Use admin client with service role key to bypass RLS
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `items/${fileName}`;

      // Convert File to Buffer for upload
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage.from("Items").upload(filePath, buffer, {
          contentType: imageFile.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return {
          success: false,
          error: "Failed to upload image: " + uploadError.message,
        };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("Items").getPublicUrl(filePath);

      item_image_url = publicUrl;
    }

    // Validate with Zod
    const validatedData = ItemCreateSchema.parse({
      ...itemData,
      item_image_url,
    });

    // Create item in database with created_by
    const newItem = new ItemModel({
      ...validatedData,
      created_by: user.admin_id,
    });

    await newItem.save();

    revalidatePath("/dashboard/assistance");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(newItem)),
      message: "Item created successfully",
    };
  } catch (error) {
    console.error("Error creating item:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create item" };
  }
}

// ============ GET ALL ITEMS ============
export async function getItems() {
  try {
    await connectToDatabase();

    const items = await ItemModel.find({}).sort({ created_at: -1 }).lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
    };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false, error: "Failed to fetch items" };
  }
}

// ============ GET SINGLE ITEM ============
export async function getItem(itemId: string) {
  try {
    await connectToDatabase();

    const item = await ItemModel.findOne({ item_id: itemId }).lean();

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(item)),
    };
  } catch (error) {
    console.error("Error fetching item:", error);
    return { success: false, error: "Failed to fetch item" };
  }
}

// ============ UPDATE ITEM ============
export async function updateItem(itemId: string, formData: FormData) {
  try {
    // Get current user from auth
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Connect to MongoDB
    await connectToDatabase();

    const existingItem = await ItemModel.findOne({ item_id: itemId });

    if (!existingItem) {
      return { success: false, error: "Item not found" };
    }

    // Extract form data
    const itemData = {
      item_name: formData.get("item_name") as string,
      item_description: (formData.get("item_description") as string) || "",
      category: formData.get("category") as any,
      stock: parseInt(formData.get("stock") as string) || existingItem.stock,
      unit: formData.get("unit") as any,
      location: (formData.get("location") as string) || existingItem.location,
      expiry_date:
        (formData.get("expiry_date") as string) || existingItem.expiry_date,
      is_medical: formData.get("is_medical") === "true",
      requires_prescription: formData.get("requires_prescription") === "true",
      requires_med_cert: formData.get("requires_med_cert") === "true",
      requires_brgy_cert: formData.get("requires_brgy_cert") === "true",
      is_consumable: formData.get("is_consumable") !== "false",
      needs_fitting: formData.get("needs_fitting") === "true",
      size: (formData.get("size") as string) || existingItem.size,
      brand: (formData.get("brand") as string) || existingItem.brand,
    };

    // Handle image upload if present
    const imageFile = formData.get("item_image") as File;
    let item_image_url = existingItem.item_image_url;

    if (imageFile && imageFile.size > 0) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(imageFile.type)) {
        return {
          success: false,
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.",
        };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (imageFile.size > maxSize) {
        return {
          success: false,
          error: "File size too large. Maximum size is 5MB.",
        };
      }

      // Delete old image if exists
      if (existingItem.item_image_url) {
        try {
          const url = new URL(existingItem.item_image_url);
          const pathMatch = url.pathname.match(/\/Items\/(.+)$/);

          if (pathMatch && pathMatch[1]) {
            const oldFilePath = decodeURIComponent(pathMatch[1]);
            await supabaseAdmin.storage.from("Items").remove([oldFilePath]);
          }
        } catch (imageError) {
          console.error("Error deleting old image:", imageError);
          // Continue with new image upload even if old deletion fails
        }
      }

      // Upload new image
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage.from("Items").upload(filePath, buffer, {
          contentType: imageFile.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        return {
          success: false,
          error: "Failed to upload image: " + uploadError.message,
        };
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("Items").getPublicUrl(filePath);

      item_image_url = publicUrl;
    }

    // Prepare update data
    const updateData = {
      ...itemData,
      item_image_url,
    };

    // Validate with Zod
    const validatedData = ItemUpdateSchema.parse(updateData);

    // Update item in database with updated_by
    Object.assign(existingItem, {
      ...validatedData,
      updated_by: user.admin_id,
    });

    await existingItem.save();

    revalidatePath("/dashboard/assistance");
    return {
      success: true,
      data: JSON.parse(JSON.stringify(existingItem)),
      message: "Item updated successfully",
    };
  } catch (error) {
    console.error("Error updating item:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update item" };
  }
}

// ============ DELETE ITEM ============
export async function deleteItem(itemId: string) {
  try {
    // Get current user from auth
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Connect to MongoDB
    await connectToDatabase();

    const item = await ItemModel.findOne({ item_id: itemId });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    // Delete image from Supabase if exists
    if (item.item_image_url) {
      try {
        const url = new URL(item.item_image_url);
        const pathMatch = url.pathname.match(/\/Items\/(.+)$/);

        if (pathMatch && pathMatch[1]) {
          const filePath = decodeURIComponent(pathMatch[1]);
          await supabaseAdmin.storage.from("Items").remove([filePath]);
        }
      } catch (imageError) {
        console.error("Error deleting image from Supabase:", imageError);
        // Continue with item deletion even if image deletion fails
      }
    }

    await ItemModel.deleteOne({ item_id: itemId });

    revalidatePath("/dashboard/assistance");
    return {
      success: true,
      message: "Item deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting item:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete item" };
  }
}

// ============ GET LOW STOCK ITEMS ============
export async function getLowStockItems(threshold: number = 5) {
  try {
    await connectToDatabase();

    const items = await ItemModel.find({
      stock: { $lte: threshold, $gt: 0 },
    })
      .sort({ stock: 1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
      count: items.length,
    };
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    return { success: false, error: "Failed to fetch low stock items" };
  }
}

// ============ GET OUT OF STOCK ITEMS ============
export async function getOutOfStockItems() {
  try {
    await connectToDatabase();

    const items = await ItemModel.find({ stock: 0 })
      .sort({ item_name: 1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
      count: items.length,
    };
  } catch (error) {
    console.error("Error fetching out of stock items:", error);
    return { success: false, error: "Failed to fetch out of stock items" };
  }
}

// ============ GET EXPIRING ITEMS ============
export async function getExpiringItems(days: number = 30) {
  try {
    await connectToDatabase();

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const items = await ItemModel.find({
      expiry_date: {
        $ne: null,
        $gte: todayStr,
        $lte: futureDateStr,
      },
    })
      .sort({ expiry_date: 1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
      count: items.length,
    };
  } catch (error) {
    console.error("Error fetching expiring items:", error);
    return { success: false, error: "Failed to fetch expiring items" };
  }
}

// ============ GET ITEMS BY CATEGORY ============
export async function getItemsByCategory(category: string) {
  try {
    await connectToDatabase();

    const items = await ItemModel.find({ category })
      .sort({ item_name: 1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
    };
  } catch (error) {
    console.error("Error fetching items by category:", error);
    return { success: false, error: "Failed to fetch items by category" };
  }
}

// ============ SEARCH ITEMS ============
export async function searchItems(searchTerm: string) {
  try {
    await connectToDatabase();

    const items = await ItemModel.find({
      $text: { $search: searchTerm },
    })
      .sort({ score: { $meta: "textScore" } })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
    };
  } catch (error) {
    console.error("Error searching items:", error);
    return { success: false, error: "Failed to search items" };
  }
}

// ============ GENERATE STOCK ALERTS ============
export async function getStockAlerts() {
  try {
    await connectToDatabase();

    const items = await ItemModel.find({
      $or: [
        { stock: { $lte: 5 } },
        {
          expiry_date: {
            $ne: null,
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        },
      ],
    }).lean();

    const alerts = items
      .map((item) => generateStockAlert(item))
      .filter((alert) => alert !== null);

    // Sort by priority: High > Medium > Low
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    alerts.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return {
      success: true,
      data: alerts,
    };
  } catch (error) {
    console.error("Error generating stock alerts:", error);
    return { success: false, error: "Failed to generate stock alerts" };
  }
}

// ============ GET ITEMS BY CERTIFICATE REQUIREMENTS ============
export async function getItemsByCertificateRequirements(
  requiresMedCert?: boolean,
  requiresBrgyCert?: boolean,
) {
  try {
    await connectToDatabase();

    const query: any = {};
    if (requiresMedCert !== undefined) {
      query.requires_med_cert = requiresMedCert;
    }
    if (requiresBrgyCert !== undefined) {
      query.requires_brgy_cert = requiresBrgyCert;
    }

    const items = await ItemModel.find(query).sort({ item_name: 1 }).lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(items)),
    };
  } catch (error) {
    console.error("Error fetching items by certificate requirements:", error);
    return {
      success: false,
      error: "Failed to fetch items by certificate requirements",
    };
  }
}

// ============ BULK UPDATE STOCK ============
export async function bulkUpdateStock(
  updates: Array<{ itemId: string; stock: number }>,
) {
  try {
    // Get current user from auth
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await connectToDatabase();

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const item = await ItemModel.findOne({ item_id: update.itemId });

        if (!item) {
          errors.push({ itemId: update.itemId, error: "Item not found" });
          continue;
        }

        item.stock = update.stock;
        item.updated_by = user.admin_id;
        await item.save();

        results.push(item);
      } catch (error) {
        errors.push({ itemId: update.itemId, error: String(error) });
      }
    }

    revalidatePath("/dashboard/assistance");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(results)),
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${results.length} items${errors.length > 0 ? `, ${errors.length} failed` : ""}`,
    };
  } catch (error) {
    console.error("Error in bulk update:", error);
    return { success: false, error: "Failed to perform bulk update" };
  }
}
