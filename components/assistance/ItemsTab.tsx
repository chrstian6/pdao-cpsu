// components/assistance/ItemsTab.tsx
"use client";

import { useState } from "react";
import { Item } from "@/types/item";
import { Package, Search, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import Image from "next/image";
import AddItemModal from "./AddItemModal";
import { deleteItem } from "@/actions/item";
import { useAuthStore } from "@/lib/store/auth-store";

interface ItemsTabProps {
  initialItems: Item[];
}

export default function ItemsTab({ initialItems }: ItemsTabProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { user } = useAuthStore();

  const categories = [
    "All",
    "Medical Supplies",
    "Mobility Aids",
    "Food Assistance",
    "Hygiene Kits",
    "Assistive Devices",
    "Medicines",
    "Vitamins",
    "Wheelchairs",
    "Crutches",
    "Canes",
    "Hearing Aids",
    "Glasses",
    "Diapers",
    "Milk",
    "Other",
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getStockStatusColor = (item: Item) => {
    if (item.stock <= 0) return "bg-red-100 text-red-800";
    if (item.stock <= 5) return "bg-yellow-100 text-yellow-800";
    if (item.stock <= 10) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const handleItemAdded = (newItem: Item) => {
    if (itemToEdit) {
      // Update existing item in list
      setItems((prev) =>
        prev.map((item) => (item.item_id === newItem.item_id ? newItem : item)),
      );
      setItemToEdit(null);
    } else {
      // Add new item to list
      setItems((prev) => [newItem, ...prev]);
    }
    setShowAddModal(false);
  };

  const handleEdit = (item: Item) => {
    setItemToEdit(item);
    setShowAddModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    const result = await deleteItem(itemId);
    if (result.success) {
      setItems((prev) => prev.filter((item) => item.item_id !== itemId));
    } else {
      alert(result.error || "Failed to delete item");
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setItemToEdit(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header with Add Button - Show user role for debugging/info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Inventory Items
            </h2>
            {user && (
              <span className="text-xs text-gray-500">
                Logged in as: {user.full_name} ({user.role})
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add New Item
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items by name, ID, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="all">All Categories</option>
            {categories.slice(1).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
            <Package className="h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No items found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your search or filter"
                : "Get started by adding a new item"}
            </p>
            {!searchTerm && selectedCategory === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Add New Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.item_id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* Item Image */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.item_image_url ? (
                      <Image
                        src={item.item_image_url}
                        alt={item.item_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {item.item_name}
                        </h3>
                        <p className="text-xs text-gray-500">{item.item_id}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStockStatusColor(item)}`}
                      >
                        {item.stock} {item.unit}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {item.item_description || "No description"}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                        {item.category}
                      </span>
                      {item.stock <= 5 && item.stock > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                          <AlertCircle className="h-3 w-3" />
                          Low Stock
                        </span>
                      )}
                      {item.stock <= 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          <AlertCircle className="h-3 w-3" />
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.item_id)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {showAddModal && (
        <AddItemModal
          onClose={handleCloseModal}
          onItemAdded={handleItemAdded}
          itemToEdit={itemToEdit}
        />
      )}
    </>
  );
}
