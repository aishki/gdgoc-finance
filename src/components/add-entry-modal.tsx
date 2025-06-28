"use client";

import type React from "react";
import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload } from "lucide-react";
import { supabase, type Category } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  categories: Category[];
  onEntryAdded: () => void;
}

export function AddEntryModal({
  isOpen,
  onClose,
  eventId,
  categories,
  onEntryAdded,
}: AddEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category_id: "",
    item_name: "",
    amount: "",
    payment_method: "",
    to_be_reimbursed: false,
    reimbursement_source: "",
    reimbursement_status: "pending" as "pending" | "completed",
    entry_date: new Date().toISOString().split("T")[0],
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      category_id: "",
      item_name: "",
      amount: "",
      payment_method: "",
      to_be_reimbursed: false,
      reimbursement_source: "",
      reimbursement_status: "pending",
      entry_date: new Date().toISOString().split("T")[0],
    });
    setReceiptFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 5MB",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image file",
        });
        return;
      }

      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (
    file: File
  ): Promise<{ url: string; filename: string } | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;

      console.log("Attempting to upload file:", fileName);

      // Try to upload directly without checking bucket existence first
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error details:", error);

        // Handle specific error cases
        if (error.message?.includes("Bucket not found")) {
          throw new Error(
            "The 'receipts' storage bucket was not found. Please check your Supabase Storage configuration."
          );
        } else if (error.message?.includes("not allowed")) {
          throw new Error(
            "Upload not allowed. Please check your storage bucket policies and make sure the bucket is public or has the correct RLS policies."
          );
        } else if (error.message?.includes("duplicate")) {
          throw new Error(
            "A file with this name already exists. Please try again."
          );
        } else {
          throw new Error(error.message || "Failed to upload file");
        }
      }

      console.log("Upload successful:", data);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(fileName);

      console.log("Public URL:", publicUrl);

      return { url: publicUrl, filename: file.name };
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!formData.category_id || !formData.item_name || !formData.amount) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);
    try {
      let receiptData = null;
      if (receiptFile) {
        try {
          receiptData = await uploadReceipt(receiptFile);
          toast({
            title: "Receipt uploaded",
            description: "Receipt uploaded successfully",
          });
        } catch (uploadError: any) {
          console.error("Receipt upload failed:", uploadError);
          toast({
            variant: "destructive",
            title: "Receipt Upload Failed",
            description: uploadError.message,
          });
          // Continue without receipt if upload fails
        }
      }

      const { error } = await supabase.from("budget_entries").insert({
        event_id: eventId,
        category_id: formData.category_id,
        item_name: formData.item_name,
        amount: Number.parseFloat(formData.amount),
        payment_method: formData.payment_method || null,
        receipt_photo_url: receiptData?.url || null,
        receipt_filename: receiptData?.filename || null,
        to_be_reimbursed: formData.to_be_reimbursed,
        reimbursement_source: formData.to_be_reimbursed
          ? formData.reimbursement_source
          : null,
        reimbursement_status: formData.to_be_reimbursed
          ? formData.reimbursement_status
          : "pending",
        entry_date: formData.entry_date,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget entry added successfully",
      });

      onEntryAdded();
      handleClose();
    } catch (error: any) {
      console.error("Error adding entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add budget entry",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to truncate filename for display
  const truncateFilename = (filename: string, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;

    const extension = filename.split(".").pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
    const truncatedName = nameWithoutExt.substring(
      0,
      maxLength - extension!.length - 4
    ); // -4 for "..." and "."

    return `${truncatedName}...${extension}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Add Budget Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category" className="mb-1.5">
              Category *
            </Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => handleInputChange("category_id", value)}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span
                      className={
                        category.type === "Income"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      [{category.type}]
                    </span>{" "}
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="item_name" className="mb-1.5">
              Item Name *
            </Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={(e) => handleInputChange("item_name", e.target.value)}
              className="bg-gray-700 border-gray-600"
              placeholder="Enter item description"
            />
          </div>

          <div>
            <Label htmlFor="amount" className="mb-1.5">
              Amount (₱) *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              className="bg-gray-700 border-gray-600"
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="payment_method" className="mb-1.5">
              Payment Method
            </Label>
            <Input
              id="payment_method"
              value={formData.payment_method}
              onChange={(e) =>
                handleInputChange("payment_method", e.target.value)
              }
              className="bg-gray-700 border-gray-600"
              placeholder="e.g., Cash, Credit Card, Bank Transfer"
            />
          </div>

          <div>
            <Label htmlFor="entry_date" className="mb-1.5">
              Entry Date
            </Label>
            <Input
              id="entry_date"
              type="date"
              value={formData.entry_date}
              onChange={(e) => handleInputChange("entry_date", e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="receipt" className="mb-1.5">
              Receipt Photo (Optional)
            </Label>
            <div className="mt-1">
              <input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("receipt")?.click()}
                className="w-full border-gray-600 justify-start text-left"
                title={
                  receiptFile ? receiptFile.name : "Upload Receipt (Max 5MB)"
                }
              >
                <Upload className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">
                  {receiptFile
                    ? truncateFilename(receiptFile.name)
                    : "Upload Receipt (Max 5MB)"}
                </span>
              </Button>
            </div>
            {receiptFile && (
              <p className="text-xs text-gray-400 mt-1 break-all">
                Full name: {receiptFile.name}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="reimbursement"
              checked={formData.to_be_reimbursed}
              onCheckedChange={(checked) =>
                handleInputChange("to_be_reimbursed", checked)
              }
            />
            <Label htmlFor="reimbursement" className="mb-1.5">
              To be reimbursed?
            </Label>
          </div>

          {formData.to_be_reimbursed && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reimbursement_source" className="mb-1.5">
                  Reimbursement Source
                </Label>
                <Input
                  id="reimbursement_source"
                  value={formData.reimbursement_source}
                  onChange={(e) =>
                    handleInputChange("reimbursement_source", e.target.value)
                  }
                  className="bg-gray-700 border-gray-600"
                  placeholder="Enter name of person/organization"
                />
              </div>
              <div>
                <Label htmlFor="reimbursement_status" className="mb-1.5">
                  Reimbursement Status
                </Label>
                <Select
                  value={formData.reimbursement_status}
                  onValueChange={(value: "pending" | "completed") =>
                    handleInputChange("reimbursement_status", value)
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.category_id ||
                !formData.item_name ||
                !formData.amount ||
                loading
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
