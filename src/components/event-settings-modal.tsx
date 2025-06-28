/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Trash2 } from "lucide-react";
import { supabase, type Event, type Category } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface EventSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onEventUpdated: () => void;
}

export function EventSettingsModal({
  isOpen,
  onClose,
  event,
  onEventUpdated,
}: EventSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "categories" | "delete">(
    "basic"
  );
  const [loading, setLoading] = useState(false);
  const [eventName, setEventName] = useState(event.name);
  const [eventStatus, setEventStatus] = useState(event.status);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"Income" | "Expense">(
    "Income"
  );
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setEventName(event.name);
      setEventStatus(event.status);
      setDeletePassword("");
      setShowDeleteConfirm(false);
      fetchCategories();
    }
  }, [isOpen, event]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("event_id", event.id)
        .order("type", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const updateBasicInfo = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: eventName,
          status: eventStatus,
        })
        .eq("id", event.id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      onEventUpdated();
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update event",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("categories").insert({
        event_id: event.id,
        name: newCategory.trim(),
        type: newCategoryType,
      });

      if (error) throw error;
      setNewCategory("");
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add category",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    if (deletePassword !== "oatside-pepero") {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Please enter the correct password to delete this event",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Event Deleted",
        description:
          "Event and all associated data have been permanently deleted",
      });

      onClose();
      router.push("/");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete event",
      });
    } finally {
      setLoading(false);
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "Income");
  const expenseCategories = categories.filter((c) => c.type === "Expense");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Event Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex border-b border-gray-700">
            <button
              className={`px-4 py-2 ${
                activeTab === "basic"
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Info
            </button>
            <button
              className={`px-4 py-2 ${
                activeTab === "categories"
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("categories")}
            >
              Categories
            </button>
            <button
              className={`px-4 py-2 ${
                activeTab === "delete"
                  ? "border-b-2 border-red-500 text-red-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("delete")}
            >
              Delete
            </button>
          </div>

          {activeTab === "basic" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-name" className="mb-1.5">
                  Event Name
                </Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="event-status" className="mb-1.5">
                  Status
                </Label>
                <Select
                  value={eventStatus}
                  onValueChange={(value: any) => setEventStatus(value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateBasicInfo}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={newCategoryType}
                    onValueChange={(value: "Income" | "Expense") =>
                      setNewCategoryType(value)
                    }
                  >
                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="bg-gray-700 border-gray-600"
                    placeholder="Category name"
                    onKeyPress={(e) => e.key === "Enter" && addCategory()}
                  />
                  <Button
                    onClick={addCategory}
                    disabled={!newCategory.trim() || loading}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">
                    Income Categories
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {incomeCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between bg-gray-700 p-2 rounded text-sm"
                      >
                        <span>{category.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {incomeCategories.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        No income categories
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">
                    Expense Categories
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {expenseCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between bg-gray-700 p-2 rounded text-sm"
                      >
                        <span>{category.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {expenseCategories.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        No expense categories
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 bg-transparent"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {activeTab === "delete" && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <h3 className="text-red-400 font-semibold">Danger Zone</h3>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  This action will permanently delete the event and all
                  associated data including:
                </p>
                <ul className="text-sm text-gray-300 list-disc list-inside mb-4 space-y-1">
                  <li>All budget entries</li>
                  <li>All categories</li>
                  <li>All uploaded receipts</li>
                  <li>Event information</li>
                </ul>
                <p className="text-sm text-red-400 font-semibold">
                  This action cannot be undone and there is no way to restore
                  the data.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="w-full border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  I want to delete this event
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delete-password" className="mb-1.5">
                      Enter password to confirm deletion:
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="bg-gray-700 border-gray-600"
                      placeholder="Enter password"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter admin password to confirm deletion.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword("");
                      }}
                      className="flex-1 border-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={deleteEvent}
                      disabled={loading || deletePassword !== "oatside-pepero"}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {loading ? "Deleting..." : "Delete Forever"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
