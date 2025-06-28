/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
import { Plus, X, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventAdded: () => void;
}

type EventFormData = {
  name: string;
  allocated_budget: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: "Active" | "Completed" | "On Hold" | "Cancelled";
};

export function AddEventModal({
  isOpen,
  onClose,
  onEventAdded,
}: AddEventModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    allocated_budget: "",
    venue: "",
    start_date: "",
    end_date: "",
    status: "Active",
  });
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState("");
  const { toast } = useToast();

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: "",
      allocated_budget: "",
      venue: "",
      start_date: "",
      end_date: "",
      status: "Active",
    });
    setIncomeCategories([]);
    setExpenseCategories([]);
    setCurrentCategory("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addCategory = (type: "income" | "expense") => {
    if (!currentCategory.trim()) return;

    if (type === "income") {
      setIncomeCategories((prev) => [...prev, currentCategory.trim()]);
    } else {
      setExpenseCategories((prev) => [...prev, currentCategory.trim()]);
    }
    setCurrentCategory("");
  };

  const removeCategory = (type: "income" | "expense", index: number) => {
    if (type === "income") {
      setIncomeCategories((prev) => prev.filter((_, i) => i !== index));
    } else {
      setExpenseCategories((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // --- begin new code ---
      // Validate budget
      const budgetNumber = Number.parseFloat(formData.allocated_budget);
      if (Number.isNaN(budgetNumber)) {
        console.warn("Allocated Budget is not a number – defaulting to 0");
      }

      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          name: formData.name.trim(),
          allocated_budget: Number.isNaN(budgetNumber) ? 0 : budgetNumber,
          venue: formData.venue.trim(),
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: formData.status,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create categoriess
      const allCategories = [
        ...incomeCategories.map((name) => ({
          event_id: eventData.id,
          name,
          type: "Income" as const,
        })),
        ...expenseCategories.map((name) => ({
          event_id: eventData.id,
          name,
          type: "Expense" as const,
        })),
      ];

      if (allCategories.length > 0) {
        const { error: categoriesError } = await supabase
          .from("categories")
          .insert(allCategories);

        if (categoriesError) throw categoriesError;
      }

      onEventAdded();
      handleClose();
    } catch (err: any) {
      // ── Enhanced error diagnostics ───────────────────────────────
      // Supabase exposes PostgREST errors in `err.code` + `err.message`
      // but JSON.stringify(err) is `{}`.  Log the raw object so you
      // can inspect everything.
      console.group(
        "%cError creating event",
        "color:#f87171;font-weight:bold;"
      );
      console.dir(err, { depth: null });
      console.groupEnd();

      // Special hint if the `events` table hasn’t been created yet.
      if (err?.code === "42P01") {
        toast({
          variant: "destructive",
          title: "Events table not found",
          description:
            "Run scripts/01-create-tables.sql in Supabase, then try again.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Unable to create event",
          description: err?.message ?? "Unknown Supabase error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 =
    formData.name &&
    formData.allocated_budget &&
    formData.venue &&
    formData.start_date &&
    formData.end_date;
  const canProceedToStep3 = incomeCategories.length > 0;
  const canSubmit = expenseCategories.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Add New Event"}
            {step === 2 && "Income Categories"}
            {step === 3 && "Expense Categories"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-1.5">
                Event Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-gray-700 border-gray-600"
                placeholder="Enter event name"
              />
            </div>
            <div>
              <Label htmlFor="budget" className="mb-1.5">
                Allocated Budget (₱)
              </Label>
              <Input
                id="budget"
                type="number"
                value={formData.allocated_budget}
                onChange={(e) =>
                  handleInputChange("allocated_budget", e.target.value)
                }
                className="bg-gray-700 border-gray-600"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="venue" className="mb-1.5">
                Venue
              </Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => handleInputChange("venue", e.target.value)}
                className="bg-gray-700 border-gray-600"
                placeholder="Enter venue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className="mb-1.5">
                  Start Date
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="end_date" className="mb-1.5">
                  End Date
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    handleInputChange("end_date", e.target.value)
                  }
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="mb-1.5">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  handleInputChange("status", value)
                }
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
                onClick={handleClose}
                className="border-gray-600 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="bg-gray-300 hover:bg-gray-400"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Add income categories (where money comes from)
            </p>
            <div className="flex gap-2">
              <Input
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value)}
                className="bg-gray-700 border-gray-600"
                placeholder="e.g., Sponsorship, Ticket Sales"
                onKeyPress={(e) => e.key === "Enter" && addCategory("income")}
              />
              <Button
                onClick={() => addCategory("income")}
                disabled={!currentCategory.trim()}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {incomeCategories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-700 p-2 rounded"
                >
                  <span>{category}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory("income", index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedToStep3}
                className="bg-gray-300 hover:bg-gray-400"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Add expense categories (what you&apos;ll spend on)
            </p>
            <div className="flex gap-2">
              <Input
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value)}
                className="bg-gray-700 border-gray-600"
                placeholder="e.g., Food, Venue, Equipment"
                onKeyPress={(e) => e.key === "Enter" && addCategory("expense")}
              />
              <Button
                onClick={() => addCategory("expense")}
                disabled={!currentCategory.trim()}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {expenseCategories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-700 p-2 rounded"
                >
                  <span>{category}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory("expense", index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-gray-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
