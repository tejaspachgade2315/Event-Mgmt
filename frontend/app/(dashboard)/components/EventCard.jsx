"use client";

import { Button } from "@/components/ui/button";
import { CalendarIcon, Edit, FileText, Users } from "lucide-react";
export default function EventCard({ event = {}, onEdit, onViewLogs }) {
  const id = event._id;
  console.log(event);
  const formatDate = (value) => {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  const formatTime = (value) => {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const usersLabel = (event.users || [])
    .slice(0, 10)
    .map((u) => (typeof u === "string" ? u : u.name))
    .join(", ");

  return (
    <article
      className={`p-4 border rounded-lg bg-white shadow-sm`}
      aria-labelledby={`event-${id}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="text-purple-600">
            <Users className="w-5 h-5" />
          </div>
          <div
            id={`event-${id}`}
            className="text-sm font-medium text-gray-800 truncate"
          >
            {usersLabel || "—"}
          </div>
        </div>

        <div className="text-xs text-gray-600 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-gray-400 pt-1">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-700 font-medium">
                Start: {formatDate(event.startLocal)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatTime(event.startLocal)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-gray-400 pt-1">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-gray-700 font-medium">
                End: {formatDate(event.endLocal)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatTime(event.endLocal)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t my-3" />
        <div className="text-xs text-gray-400 space-y-1">
          <div>
            Created:{" "}
            {event.createdAt
              ? formatDate(event.createdAt) +
                " at " +
                formatTime(event.createdAt)
              : "—"}
          </div>
          <div>
            {event.updatedAt
              ? `Updated: ${formatDate(event.updatedAt)} at ${formatTime(
                  event.updatedAt
                )}`
              : "—"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 py-2"
            onClick={() => typeof onEdit === "function" && onEdit(id)}
          >
            <Edit className="w-4 h-4" /> Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-center gap-2 py-2"
            onClick={() => typeof onViewLogs === "function" && onViewLogs(id)}
          >
            <FileText className="w-4 h-4" /> View Logs
          </Button>
        </div>
      </div>
    </article>
  );
}
