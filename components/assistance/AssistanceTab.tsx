// app/dashboard/assistance/AssistanceTabs.tsx
"use client";

import { useState, useEffect } from "react";
import { Item } from "@/types/item";
import { Package, ClipboardList } from "lucide-react";
import ItemsTab from "@/components/assistance/ItemsTab";
import { useAuthStore } from "@/lib/store/auth-store";

interface AssistanceTabsProps {
  initialItems: Item[];
}

export default function AssistanceTabs({ initialItems }: AssistanceTabsProps) {
  const [activeTab, setActiveTab] = useState<"items" | "requests">("items");
  const { user, isAuthenticated, syncWithServer } = useAuthStore();

  // Sync auth state with server on mount
  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  const tabs = [
    { id: "items", label: "All Items", icon: Package },
    { id: "requests", label: "Requests", icon: ClipboardList },
  ] as const;

  // Don't render if not authenticated (though server should handle this)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === "items" && <ItemsTab initialItems={initialItems} />}

        {activeTab === "requests" && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
            <ClipboardList className="h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No requests yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Requests from PWDs will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
