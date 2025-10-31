"use client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getToken } from "@/lib/token";
import axios from "axios";
import { Calendar, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export default function LogsDialog({ open, onOpenChange, event }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const timezone = useSelector((state) => state.settings?.timezone) || "UTC";

  useEffect(() => {
    if (open && event?._id) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = getToken("authToken");
      if (!token) throw new Error("Unauthorized");
      const res = await axios.get(`${BASE_URL}api/events/logs/${event._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.data.success) {
        setLogs(res.data.data);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestampObj) => {
    try {
      const timestamp =
        timestampObj?.utc || timestampObj?.local || timestampObj;
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleString("en-US", {
        timeZone: timezone,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatFieldName = (field) => {
    const fieldMap = {
      users: "Profiles",
      startAtUTC: "Start date/time",
      endAtUTC: "End date/time",
      startLocal: "Start date/time",
      endLocal: "End date/time",
      eventTimezone: "Timezone",
    };
    return fieldMap[field] || field;
  };

  const formatProfiles = (profiles, allProfiles = []) => {
    if (!profiles || !Array.isArray(profiles)) return "None";

    return profiles
      .map((profile) => {
        if (typeof profile === "object" && profile.name) {
          return profile.name;
        }

        if (typeof profile === "string") {
          const foundProfile = allProfiles.find((p) => p._id === profile);
          return foundProfile?.name || profile;
        }

        return "Unknown";
      })
      .join(", ");
  };

  const formatDateValue = (value) => {
    if (!value) return "Not set";

    try {
      let dateString;
      if (typeof value === "object" && value !== null) {
        dateString = value.local || value.utc || value;
      } else {
        dateString = value;
      }

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Not set";
      }

      return date.toLocaleString("en-US", {
        timeZone: timezone,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Not set";
    }
  };

  const formatValue = (field, value, allProfiles = []) => {
    if (field === "users") {
      return formatProfiles(value, allProfiles);
    }

    if (
      field.includes("AtUTC") ||
      field.includes("Local") ||
      field.includes("At")
    ) {
      return formatDateValue(value);
    }

    if (field === "eventTimezone") {
      return value || "Not set";
    }
    return String(value || "Not set");
  };

  const allProfiles = useSelector((state) => state.profiles?.profiles || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Update History
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No update history available for this event.
            </p>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log._id || index} className="space-y-3">
                  {log.changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="flex items-start gap-3">
                      <Checkbox
                        checked={changeIndex === 0}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {formatTimestamp(log.timestampUTC)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">
                            {formatFieldName(change.field)}
                          </span>
                          {change.field === "users"
                            ? ` changed to: ${formatValue(
                                change.field,
                                change.after,
                                allProfiles
                              )}`
                            : " updated"}
                        </p>

                        {/* Show before/after for all fields except when profiles haven't changed */}
                        {!(
                          change.field === "users" &&
                          JSON.stringify(change.before) ===
                            JSON.stringify(change.after)
                        ) && (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="w-12">Before:</span>
                              <span className="flex-1">
                                {formatValue(
                                  change.field,
                                  change.before,
                                  allProfiles
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12">After:</span>
                              <span className="flex-1 text-green-600 font-medium">
                                {formatValue(
                                  change.field,
                                  change.after,
                                  allProfiles
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Separator between logs */}
                  {index < logs.length - 1 && (
                    <div className="border-t border-gray-200 my-2" />
                  )}
                </div>
              ))}

              {/* Footer with timezone info */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Times displayed in {timezone}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
