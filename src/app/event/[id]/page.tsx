"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddEntryModal } from "@/components/add-entry-modal";
import { BudgetTable } from "@/components/budget-table";
import { CashFlowChart } from "@/components/cash-flow-chart";
import {
  supabase,
  type Event,
  type Category,
  type BudgetEntry,
} from "@/lib/supabase";

const statusColors = {
  Active: "bg-green-500",
  Completed: "bg-blue-500",
  "On Hold": "bg-yellow-500",
  Cancelled: "bg-red-500",
};

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("event_id", eventId);

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch budget entries with category names
      const { data: entriesData, error: entriesError } = await supabase
        .from("budget_entries")
        .select(
          `
          *,
          categories (
            name,
            type
          )
        `
        )
        .eq("event_id", eventId)
        .order("entry_date", { ascending: false });

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryAdded = () => {
    fetchEventData();
    setIsAddModalOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-400 text-lg mb-4">Event not found</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Calculate financial metrics
  const totalIncome = entries
    .filter(
      (entry) =>
        categories.find((cat) => cat.id === entry.category_id)?.type ===
        "Income"
    )
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = entries
    .filter(
      (entry) =>
        categories.find((cat) => cat.id === entry.category_id)?.type ===
        "Expense"
    )
    .reduce((sum, entry) => sum + entry.amount, 0);

  const onhandCash = totalIncome;
  const leftToSpend = onhandCash - totalExpenses;
  const endingBalance = leftToSpend;

  // Calculate reimbursement metrics
  const pendingReimbursements = entries.filter(
    (entry) =>
      entry.to_be_reimbursed && entry.reimbursement_status === "pending"
  ).length;

  const completedReimbursements = entries.filter(
    (entry) =>
      entry.to_be_reimbursed && entry.reimbursement_status === "completed"
  ).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="border-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-400">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {event.venue || "Venue not set"}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(event.start_date)} - {formatDate(event.end_date)}
              </div>
              <Badge className={`${statusColors[event.status]} text-white`}>
                {event.status}
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-zinc-100"
          >
            <Plus className="w-4 h-4 mr-0.5" />
            Add Entry
          </Button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">
                Allocated Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(event.allocated_budget)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">
                Onhand Cash
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(onhandCash)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(totalExpenses)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">
                Left to Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  leftToSpend >= 0 ? "text-yellow-500" : "text-red-400"
                }`}
              >
                {formatCurrency(leftToSpend)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">
                Ending Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  endingBalance >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatCurrency(endingBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Cash Flow Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <CashFlowChart entries={entries} categories={categories} />
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Entries:</span>
                <span className="font-semibold">{entries.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Income Entries:</span>
                <span className="font-semibold text-green-400">
                  {
                    entries.filter(
                      (entry) =>
                        categories.find((cat) => cat.id === entry.category_id)
                          ?.type === "Income"
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expense Entries:</span>
                <span className="font-semibold text-red-400">
                  {
                    entries.filter(
                      (entry) =>
                        categories.find((cat) => cat.id === entry.category_id)
                          ?.type === "Expense"
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pending Reimbursements:</span>
                <span className="font-semibold text-yellow-400">
                  {pendingReimbursements}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Completed Reimbursements:</span>
                <span className="font-semibold text-green-400">
                  {completedReimbursements}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Entries Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Budget Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetTable
              entries={entries}
              categories={categories}
              onEntryUpdated={fetchEventData}
            />
          </CardContent>
        </Card>

        <AddEntryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          eventId={eventId}
          categories={categories}
          onEntryAdded={handleEntryAdded}
        />
      </div>
    </div>
  );
}
