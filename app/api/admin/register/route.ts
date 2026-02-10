// app/api/test/create-admin/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Admin } from "@/models/Admin";

export async function GET() {
  try {
    await connectToDatabase();

    const testAdminData = {
      first_name: "Christian",
      middle_name: "Lopez",
      last_name: "Esgrina",
      age: 23,
      email: "christian@pdao.gov.ph",
      password: "Admin@123",
      address: "Government Center, Metro Manila",
      phone_number: "09171234567",
      role: "MSWD-CSWDO-PDAO" as const,
    };

    // Check if exists
    const existing = await Admin.findOne({ email: testAdminData.email });
    if (existing) {
      const safeAdmin = existing.toSafeObject();
      return NextResponse.json({
        message: "Admin already exists",
        admin: safeAdmin,
        exists: true,
      });
    }

    // Create new admin
    const admin = await Admin.create(testAdminData);
    const safeAdmin = admin.toSafeObject();

    return NextResponse.json({
      message: "Test admin created successfully",
      admin: safeAdmin,
      created: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.errors || error,
      },
      { status: 500 },
    );
  }
}
