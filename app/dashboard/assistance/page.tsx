// app/dashboard/assistance/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { validateSession } from "@/actions/auth";
import { getItems } from "@/actions/item";
import AssistanceTabs from "@/components/assistance/AssistanceTab";

export default async function AssistancePage() {
  // Validate session server-side
  const { isValid } = await validateSession();

  if (!isValid) {
    redirect("/");
  }

  // Fetch items
  const itemsResult = await getItems();
  const items = itemsResult.success ? itemsResult.data : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Assistance Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage inventory and process assistance requests for PWDs
          </p>
        </div>

        {/* Tabs Component */}
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              Loading assistance data...
            </div>
          }
        >
          <AssistanceTabs initialItems={items} />
        </Suspense>
      </div>
    </div>
  );
}
