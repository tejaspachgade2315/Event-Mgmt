"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getToken } from "@/lib/token";
import axios from "axios";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

export default function UpdateEventDialog({
  open,
  onOpenChange,
  event = {},
  onUpdate,
}) {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const profiles = useSelector((s) => s.profiles?.profiles || []);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [timezone, setTimezone] = useState("Asia/Calcutta");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [minDateTime, setMinDateTime] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      setMinDateTime(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`
      );
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const utcToInputLocal = (utc) => {
    if (!utc) return "";
    try {
      const d = new Date(utc);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const ensureSeconds = (s) => {
    if (!s) return s;
    return s.length === 16 ? `${s}:00` : s;
  };

  const timeZoneOptions = useMemo(() => {
    const fallback = [
      "UTC",
      "Europe/London",
      "America/New_York",
      "Asia/Kolkata",
    ];
    const zones =
      typeof Intl?.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : fallback;
    return zones.map((tz) => {
      let shortName = tz;
      try {
        const parts = new Intl.DateTimeFormat(undefined, {
          timeZone: tz,
          timeZoneName: "short",
        }).formatToParts(new Date());
        shortName = parts.find((p) => p.type === "timeZoneName")?.value || tz;
      } catch (e) {}
      return { value: tz, label: `${tz} (${shortName})` };
    });
  }, []);

  useEffect(() => {
    if (!open || !event?._id) return;

    let mounted = true;
    setLoading(true);

    const fetchOne = async () => {
      try {
        const token = getToken("authToken");
        if (!token) throw new Error("Unauthorized");
        const res = await axios.get(`${apiBase}api/events/${event._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ev = res.data?.event ?? res.data;

        if (!mounted) return;

        const usersIds = (ev.users || []).map((u) =>
          typeof u === "string" ? u : u._id
        );
        setSelectedUsers(usersIds);

        setTimezone(ev.eventTimezone || ev.eventTimezone || "Asia/Calcutta");

        if (ev.startAtUTC) setStartLocal(utcToInputLocal(ev.startAtUTC));
        else if (ev.startLocal)
          setStartLocal(
            utcToInputLocal(ev.startLocal) || ev.startLocal.slice(0, 16)
          );

        if (ev.endAtUTC) setEndLocal(utcToInputLocal(ev.endAtUTC));
        else if (ev.endLocal)
          setEndLocal(utcToInputLocal(ev.endLocal) || ev.endLocal.slice(0, 16));
      } catch (err) {
        console.error(err);
        toast.error(
          err?.response?.data?.message || err.message || "Failed to load event"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOne();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?._id]);

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!event?._id) return;
    if (selectedUsers.length === 0) {
      toast.error("Select at least one profile");
      return;
    }
    if (!startLocal || !endLocal) {
      toast.error("Start and end date/time are required");
      return;
    }

    const patch = {
      users: selectedUsers,
      eventTimezone: timezone,
      startLocal: ensureSeconds(startLocal),
      endLocal: ensureSeconds(endLocal),
    };

    try {
      setSaving(true);
      if (typeof onUpdate === "function") {
        await onUpdate(patch);
      } else {
        const token = getToken("authToken");
        if (!token) throw new Error("Unauthorized");
        await axios.patch(`${apiBase}api/events/${event._id}`, patch, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        toast.success("Event updated");
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || err.message || "Failed to update event"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Profiles</Label>
            <div className="border rounded-md p-2 mt-1 bg-white max-h-44 overflow-auto">
              {profiles.length === 0 ? (
                <div className="text-sm text-gray-500 p-2">No profiles</div>
              ) : (
                profiles.map((p) => {
                  const id = p._id;
                  const checked = selectedUsers.includes(id);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={(v) => setTimezone(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timeZoneOptions.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <Label>Start Date & Time</Label>
              <div className="flex items-center rounded-md p-2 mt-1 bg-white">
                <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v < minDateTime) setStartLocal(minDateTime);
                    else setStartLocal(v);
                    if (endLocal && v && endLocal <= v) setEndLocal("");
                  }}
                  min={minDateTime}
                />
              </div>
            </div>

            <div>
              <Label>End Date & Time</Label>
              <div className="flex items-center rounded-md p-2 mt-1 bg-white">
                <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                <Input
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    const allowedMin = startLocal || minDateTime;
                    if (v && v < allowedMin) setEndLocal(allowedMin);
                    else setEndLocal(v);
                  }}
                  min={startLocal || minDateTime}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={saving}
            >
              {saving ? "Updating..." : "Update Event"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
