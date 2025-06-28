/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddEventModal } from "@/components/add-event-modal";
import { EventSettingsModal } from "@/components/event-settings-modal";
import { supabase, type Event } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

const statusColors = {
  Active: "bg-green-500",
  Completed: "bg-blue-500",
  "On Hold": "bg-yellow-500",
  Cancelled: "bg-red-500",
};

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Add a helper that tries the query and gracefully recovers if the table
  // hasn't been created yet (Supabase error code 42P01).
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order(sortBy === "date" ? "created_at" : "status", {
          ascending: false,
        });

      if (error) throw error;
      setEvents(data ?? []);
    } catch (err: any) {
      // 42P01 = undefined table
      if (err?.code === "42P01") {
        console.info(
          "%cSupabase table `events` not found. Did you run the SQL migration?",
          "color: #facc15; font-weight: bold;"
        );
        setEvents([]); // keep UI happy
      } else {
        console.error("Unexpected error fetching events:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [sortBy]);

  const handleEventAdded = () => {
    fetchEvents();
    setIsAddModalOpen(false);
  };

  const handleEventUpdated = () => {
    fetchEvents();
    setIsSettingsModalOpen(false);
    setSelectedEvent(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Image
                src="/gdgoc-logo.png"
                alt="GDGOC Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <h1 className="text-3xl font-bold">Event Budget Tracker</h1>
            </div>
            <p className="text-gray-400">
              Google Developer Groups on Campus - USLS
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={sortBy}
              onValueChange={(value: "date" | "status") => setSortBy(value)}
            >
              <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="status">Sort by Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#83aff0] hover:bg-[#4779c4] "
            >
              <Plus className="w-4 h-4 mr-0.5" />
              Add Event
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card
              key={event.id}
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors relative group"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-white truncate pr-8">
                    {event.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1 h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedEvent(event);
                      setIsSettingsModalOpen(true);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <Badge
                  className={`${statusColors[event.status]} text-white w-fit`}
                >
                  {event.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <Link href={`/event/${event.id}`}>
                  <div className="space-y-2 ">
                    <div className="flex items-center text-sm text-gray-400">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.venue || "Venue not set"}
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(event.start_date)} -{" "}
                      {formatDate(event.end_date)}
                    </div>
                    <div className="text-lg font-semibold text-green-400">
                      ₱{event.allocated_budget.toLocaleString()}
                      <p className="text-xs font-medium text-gray-400">
                        Allocated Budget
                      </p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No events found</p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#83aff0] hover:bg-[#4779c4] "
            >
              <Plus className="w-4 h-4 mr-0.5" />
              Create Your First Event
            </Button>
          </div>
        )}

        <AddEventModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onEventAdded={handleEventAdded}
        />

        {selectedEvent && (
          <EventSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => {
              setIsSettingsModalOpen(false);
              setSelectedEvent(null);
            }}
            event={selectedEvent}
            onEventUpdated={handleEventUpdated}
          />
        )}
      </div>
    </div>
  );
}
