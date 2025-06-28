/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Download, Search, Trash2, Upload } from "lucide-react";
import { supabase, type BudgetEntry, type Category } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface BudgetTableProps {
  entries: (BudgetEntry & { categories?: { name: string; type: string } })[];
  categories: Category[];
  onEntryUpdated: () => void;
}

type SortField = "entry_date" | "amount" | "item_name" | "categories.name";
type SortDirection = "asc" | "desc";

export function BudgetTable({
  entries,
  categories,
  onEntryUpdated,
}: BudgetTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("entry_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingCell, setEditingCell] = useState<{
    entryId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredAndSortedEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      const category = categories.find((cat) => cat.id === entry.category_id);
      const matchesSearch =
        entry.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || entry.category_id === categoryFilter;
      const matchesType = typeFilter === "all" || category?.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case "entry_date":
          aValue = new Date(a.entry_date);
          bValue = new Date(b.entry_date);
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "item_name":
          aValue = a.item_name.toLowerCase();
          bValue = b.item_name.toLowerCase();
          break;
        case "categories.name":
          aValue =
            categories
              .find((cat) => cat.id === a.category_id)
              ?.name.toLowerCase() || "";
          bValue =
            categories
              .find((cat) => cat.id === b.category_id)
              ?.name.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    entries,
    categories,
    searchTerm,
    categoryFilter,
    typeFilter,
    sortField,
    sortDirection,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const startEditing = (entryId: string, field: string, currentValue: any) => {
    setEditingCell({ entryId, field });
    setEditValue(String(currentValue));
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    try {
      const updateData: any = {};

      if (editingCell.field === "amount") {
        updateData.amount = Number.parseFloat(editValue);
      } else {
        updateData[editingCell.field] = editValue;
      }

      const { error } = await supabase
        .from("budget_entries")
        .update(updateData)
        .eq("id", editingCell.entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry updated successfully",
      });

      onEntryUpdated();
      setEditingCell(null);
      setEditValue("");
    } catch (error) {
      console.error("Error updating entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update entry",
      });
    }
  };

  const toggleReimbursementStatus = async (
    entryId: string,
    currentStatus: "pending" | "completed"
  ) => {
    try {
      const newStatus = currentStatus === "pending" ? "completed" : "pending";

      const { error } = await supabase
        .from("budget_entries")
        .update({ reimbursement_status: newStatus })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reimbursement marked as ${newStatus}`,
      });

      onEntryUpdated();
    } catch (error) {
      console.error("Error updating reimbursement status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update reimbursement status",
      });
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("budget_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });

      onEntryUpdated();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete entry",
      });
    }
  };

  const uploadReceipt = async (entryId: string, file: File) => {
    try {
      setUploadingReceipt(entryId);

      const fileExt = file.name.split(".").pop();
      const fileName = `receipts/${entryId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(fileName);

      // Update the entry with the receipt URL
      const { error: updateError } = await supabase
        .from("budget_entries")
        .update({
          receipt_photo_url: publicUrl,
          receipt_filename: file.name,
        })
        .eq("id", entryId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
      });

      onEntryUpdated();
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload receipt",
      });
    } finally {
      setUploadingReceipt(null);
    }
  };

  const handleReceiptUpload = (
    entryId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 5MB",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image file",
        });
        return;
      }

      uploadReceipt(entryId, file);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const downloadReceipt = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 bg-gray-700 border-gray-600">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Income">Income</SelectItem>
              <SelectItem value="Expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 bg-gray-700 border-gray-600">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-800 hover:bg-gray-800">
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("entry_date")}
                    className="h-auto p-0 font-semibold text-gray-300 hover:text-white"
                  >
                    Entry Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("categories.name")}
                    className="h-auto p-0 font-semibold text-gray-300 hover:text-white"
                  >
                    Category
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("item_name")}
                    className="h-auto p-0 font-semibold text-gray-300 hover:text-white"
                  >
                    Item Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("amount")}
                    className="h-auto p-0 font-semibold text-gray-300 hover:text-white"
                  >
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-gray-300">Payment Method</TableHead>
                <TableHead className="text-gray-300">Reimbursement</TableHead>
                <TableHead className="text-gray-300">Receipt</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedEntries.map((entry) => {
                const category = categories.find(
                  (cat) => cat.id === entry.category_id
                );
                return (
                  <TableRow
                    key={entry.id}
                    className="border-gray-700 hover:bg-gray-800/50"
                  >
                    <TableCell
                      onDoubleClick={() =>
                        startEditing(entry.id, "entry_date", entry.entry_date)
                      }
                    >
                      {editingCell?.entryId === entry.id &&
                      editingCell?.field === "entry_date" ? (
                        <Input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 bg-gray-700 border-gray-600"
                          onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      ) : (
                        formatDate(entry.entry_date)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          category?.type === "Income"
                            ? "bg-green-400"
                            : "bg-red-400"
                        }
                      >
                        {category?.name}
                      </Badge>
                    </TableCell>
                    <TableCell
                      onDoubleClick={() =>
                        startEditing(entry.id, "item_name", entry.item_name)
                      }
                    >
                      {editingCell?.entryId === entry.id &&
                      editingCell?.field === "item_name" ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 bg-gray-700 border-gray-600"
                          onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      ) : (
                        entry.item_name
                      )}
                    </TableCell>
                    <TableCell
                      onDoubleClick={() =>
                        startEditing(entry.id, "amount", entry.amount)
                      }
                    >
                      {editingCell?.entryId === entry.id &&
                      editingCell?.field === "amount" ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 bg-gray-700 border-gray-600"
                          onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      ) : (
                        <span
                          className={
                            category?.type === "Income"
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {formatCurrency(entry.amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      onDoubleClick={() =>
                        startEditing(
                          entry.id,
                          "payment_method",
                          entry.payment_method || ""
                        )
                      }
                    >
                      {editingCell?.entryId === entry.id &&
                      editingCell?.field === "payment_method" ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 bg-gray-700 border-gray-600"
                          onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      ) : (
                        entry.payment_method || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.to_be_reimbursed ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                entry.reimbursement_status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                entry.reimbursement_status === "completed"
                                  ? "bg-green-600"
                                  : "bg-yellow-600"
                              }
                            >
                              {entry.reimbursement_status === "completed"
                                ? "Completed"
                                : "Pending"}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    toggleReimbursementStatus(
                                      entry.id,
                                      entry.reimbursement_status || "pending"
                                    )
                                  }
                                  className="p-1 h-6 w-6"
                                >
                                  <Checkbox
                                    checked={
                                      entry.reimbursement_status === "completed"
                                    }
                                    className="h-4 w-4"
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Mark as{" "}
                                  {entry.reimbursement_status === "completed"
                                    ? "pending"
                                    : "completed"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            {entry.reimbursement_source && (
                              <span className="text-sm text-gray-400">
                                ({entry.reimbursement_source})
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.receipt_photo_url && entry.receipt_filename ? (
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  downloadReceipt(
                                    entry.receipt_photo_url!,
                                    entry.receipt_filename!
                                  )
                                }
                                className="text-blue-400 hover:text-blue-300 p-1 h-8"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download receipt: {entry.receipt_filename}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleReceiptUpload(entry.id, e)}
                              className="hidden"
                              id={`receipt-${entry.id}`}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    document
                                      .getElementById(`receipt-${entry.id}`)
                                      ?.click()
                                  }
                                  disabled={uploadingReceipt === entry.id}
                                  className="text-yellow-400 hover:text-yellow-300 p-1 h-8"
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Update receipt</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReceiptUpload(entry.id, e)}
                            className="hidden"
                            id={`receipt-${entry.id}`}
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  document
                                    .getElementById(`receipt-${entry.id}`)
                                    ?.click()
                                }
                                disabled={uploadingReceipt === entry.id}
                                className="text-green-400 hover:text-green-300"
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                {uploadingReceipt === entry.id
                                  ? "Uploading..."
                                  : "Upload"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Upload receipt</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(entry.id)}
                            className="text-red-400 hover:text-red-300 p-1 h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete entry</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredAndSortedEntries.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No entries found matching your filters.
          </div>
        )}

        <div className="text-sm text-gray-400">
          Showing {filteredAndSortedEntries.length} of {entries.length} entries
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={() => setDeleteConfirm(null)}
        >
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete this budget entry? This action
                cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteConfirm && deleteEntry(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
