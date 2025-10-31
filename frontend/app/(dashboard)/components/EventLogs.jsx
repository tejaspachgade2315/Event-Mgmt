"use client";
import { getToken } from "@/lib/token";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function LogsDialog({ open, onOpenChange, event }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

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
      const res = await axios.get(`${BASE_URL}api/events/logs/${event._id}`,{
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Event Logs</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No logs available for this event.
            </p>
          ) : (
            <div className="space-y-6">
              {logs.map((log) => (
                <div key={log._id} className="border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">
                      Changed by:{" "}
                      <span className="text-primary font-semibold">
                        {log.changedBy?.name || "Unknown"}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.timestampUTC.local).toLocaleString()}
                    </p>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-2 text-sm">
                    {log.changes.map((change, i) => (
                      <div key={i} className="bg-muted p-2 rounded-md">
                        <p className="font-medium">{change.field}</p>
                        <div className="ml-2 text-xs">
                          <p className="text-red-500">
                            Before:{" "}
                            {typeof change.before === "object"
                              ? JSON.stringify(change.before)
                              : String(change.before)}
                          </p>
                          <p className="text-green-600">
                            After:{" "}
                            {typeof change.after === "object"
                              ? JSON.stringify(change.after)
                              : String(change.after)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
