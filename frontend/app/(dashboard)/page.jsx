"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { fetchProfiles } from "../store/profiles/profileSlice";
import UpdateEventDialog from "./components/EditEvent";
import EventCard from "./components/EventCard";
import LogsDialog from "./components/EventLogs";

export default function EventPage() {
  const dispatch = useDispatch();
  const {
    profiles = [],
    loading,
    error,
  } = useSelector((state) => state.profiles);

  const [selectedDraftProfiles, setSelectedDraftProfiles] = useState([]);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [profileQuery, setProfileQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const dropdownRef = useRef(null);
  const profileSearchRef = useRef(null);
  const [appliedProfiles, setAppliedProfiles] = useState([]);
  const [appliedOpen, setAppliedOpen] = useState(false);
  const [appliedQuery, setAppliedQuery] = useState("");
  const appliedRef = useRef(null);

  const [timezone, setTimezone] = useState("America/New_York");
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [activeEvent, setActiveEvent] = useState(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const handleViewLogs = (event) => {
    setActiveEvent(event);
    setShowLogsDialog(true);
  };

  const handleEditEvent = (event) => {
    setActiveEvent(event);
    setShowUpdateDialog(true);
  };

  const ensureSeconds = (localDateTime) => {
    if (!localDateTime) return "";
    return localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  };

  const buildEventsQuery = ({
    userIds,
    from,
    to,
    limit,
    page,
    viewerTimezone,
  }) => {
    const parts = [];
    if (userIds)
      parts.push(`userId=${encodeURIComponent(JSON.stringify(userIds))}`);
    if (from) parts.push(`from=${encodeURIComponent(from)}`);
    if (to) parts.push(`to=${encodeURIComponent(to)}`);
    if (limit) parts.push(`limit=${Number(limit)}`);
    if (page) parts.push(`page=${Number(page)}`);
    if (viewerTimezone)
      parts.push(`viewerTimezone=${encodeURIComponent(viewerTimezone)}`);
    return parts.length ? `?${parts.join("&")}` : "";
  };

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchEvents = async (opts = {}) => {
    setEventsLoading(true);
    try {
      const token = getToken("authToken");
      if (!token) throw new Error("Unauthorized");
      const q = buildEventsQuery({
        userIds: opts.userIds ?? appliedProfiles,
        from: opts.from,
        to: opts.to,
        limit: opts.limit,
        page: opts.page,
        viewerTimezone: opts.viewerTimezone ?? timezone,
      });
      const url = `${API_BASE}api/events${q}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(res.data.events || res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to load events"
      );
    } finally {
      setEventsLoading(false);
    }
  };

  const createEvent = async () => {
    if (!selectedDraftProfiles || selectedDraftProfiles.length === 0) {
      toast.error("Select at least one profile");
      return;
    }
    if (!startDateTime || !endDateTime) {
      toast.error("Start and end date/time required");
      return;
    }
    try {
      const token = getToken("authToken");
      if (!token) throw new Error("Unauthorized");
      const payload = {
        users: selectedDraftProfiles,
        eventTimezone: timezone,
        startLocal: ensureSeconds(startDateTime),
        endLocal: ensureSeconds(endDateTime),
      };
      const res = await axios.post(`${API_BASE}api/events`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const newId = res.data?._id || null;
      toast.success("Event created");
      await fetchEvents();
      return newId;
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data || err.message || "Failed to create event"
      );
    }
  };

  const updateEvent = async (eventId, patchBody = {}) => {
    if (!eventId) return;
    try {
      const token = getToken("authToken");
      if (!token) throw new Error("Unauthorized");
      if (patchBody.startLocal)
        patchBody.startLocal = ensureSeconds(patchBody.startLocal);
      if (patchBody.endLocal)
        patchBody.endLocal = ensureSeconds(patchBody.endLocal);
      const res = await axios.patch(
        `${API_BASE}api/events/${eventId}`,
        patchBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Event updated");
      await fetchEvents();
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to update event"
      );
    }
  };

  const pad = (n) => String(n).padStart(2, "0");
  const getLocalMin = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;

  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [minDateTime, setMinDateTime] = useState(() => getLocalMin());

  useEffect(() => {
    const id = setInterval(() => setMinDateTime(getLocalMin()), 60_000);
    return () => clearInterval(id);
  }, []);

  const timeZoneOptions = useMemo(() => {
    const fallback = [
      "UTC",
      "Europe/London",
      "Europe/Paris",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Australia/Sydney",
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
    dispatch(fetchProfiles());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    function onDoc(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfilesOpen(false);
      }
      if (appliedRef.current && !appliedRef.current.contains(e.target)) {
        setAppliedOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleProfile = (id) => {
    setSelectedDraftProfiles((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleAddProfile = async (name) => {
    if (!name || !name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    setAdding(true);
    try {
      const token = getToken("authToken");
      const res = await axios.post(
        `${API_BASE}api/auth/register`,
        { name: name.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Profile added successfully");
      await dispatch(fetchProfiles()).unwrap?.();
      const newId = res.data?.user?._id;
      if (newId) {
        setSelectedDraftProfiles((prev) => [...prev, newId]);
      }
      setProfileQuery("");
      setProfilesOpen(true);
      setTimeout(() => profileSearchRef.current?.focus?.(), 50);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data || "Error adding profile");
    } finally {
      setAdding(false);
    }
  };

  const filteredDraftProfiles = profiles.filter((p) =>
    p.name?.toLowerCase().includes(profileQuery.toLowerCase())
  );

  const filteredAppliedProfiles = profiles.filter((p) =>
    p.name?.toLowerCase().includes(appliedQuery.toLowerCase())
  );

  useEffect(() => {
    if (appliedProfiles && appliedProfiles.length > 0) {
      fetchEvents();
    } else {
      setEvents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedProfiles, timezone]);

  return (
    <div className="p-8 space-y-6">
      <div className="p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Event Management</h1>
            <p className="text-gray-500">
              Create and manage events across multiple timezones
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={appliedRef}>
              <button
                type="button"
                onClick={() => {
                  setAppliedOpen((s) => !s);
                  if (!appliedOpen)
                    setTimeout(
                      () =>
                        appliedRef.current?.querySelector("input")?.focus?.(),
                      80
                    );
                }}
                className="text-left border rounded-md px-3 py-2 flex items-center gap-3 bg-white"
              >
                <span className="text-sm text-gray-700">
                  {appliedProfiles.length > 0
                    ? `${appliedProfiles.length} profile${
                        appliedProfiles.length > 1 ? "s" : ""
                      } selected`
                    : "Filter profiles..."}
                </span>
                <span className="text-xs text-gray-400">
                  {appliedOpen ? "▲" : "▼"}
                </span>
              </button>

              {appliedOpen && (
                <div className="absolute z-30 mt-2 w-80 right-0 translate-x-0 bg-white border rounded-md shadow-lg">
                  <div className="p-2">
                    <Input
                      placeholder="Search profiles..."
                      value={appliedQuery}
                      onChange={(e) => setAppliedQuery(e.target.value)}
                      className="mb-2"
                    />

                    <div className="max-h-40 overflow-y-auto">
                      {filteredAppliedProfiles.length > 0 ? (
                        filteredAppliedProfiles.map((p) => {
                          const id = p._id;
                          const checked = appliedProfiles.includes(id);
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-md cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setAppliedProfiles((prev) =>
                                    prev.includes(id)
                                      ? prev.filter((x) => x !== id)
                                      : [...prev, id]
                                  )
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="p-2 text-sm text-gray-500">
                          No profiles found
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Add profile..."
                        value={appliedQuery}
                        onChange={(e) => setAppliedQuery(e.target.value)}
                      />
                      <Button
                        onClick={() => handleAddProfile(appliedQuery)}
                        disabled={adding || !appliedQuery.trim()}
                      >
                        {adding ? "Adding..." : "Add"}
                      </Button>
                    </div>

                    <div className="mt-2 flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAppliedProfiles(selectedDraftProfiles);
                          setAppliedOpen(false);
                        }}
                        disabled={selectedDraftProfiles.length === 0}
                      >
                        Apply Draft Selection
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setAppliedProfiles([]);
                          setAppliedOpen(false);
                          setEvents([]);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative" ref={dropdownRef}>
              <Label>Profiles</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfilesOpen((s) => !s);
                    if (!profilesOpen)
                      setTimeout(() => profileSearchRef.current?.focus?.(), 80);
                  }}
                  className="flex-1 text-left border rounded-md px-3 py-2 flex items-center justify-between bg-white"
                >
                  <span className="text-sm text-gray-700">
                    {selectedDraftProfiles.length > 0
                      ? `${selectedDraftProfiles.length} profile${
                          selectedDraftProfiles.length > 1 ? "s" : ""
                        } selected`
                      : "Select profiles..."}
                  </span>
                  <span className="text-xs text-gray-400">
                    {profilesOpen ? "▲" : "▼"}
                  </span>
                </button>
              </div>

              {profilesOpen && (
                <div className="absolute z-20 mt-2 w-80 right-0 translate-x-4 bg-white border rounded-md shadow-lg">
                  <div className="p-2">
                    <Input
                      ref={profileSearchRef}
                      placeholder="Search profiles..."
                      value={profileQuery}
                      onChange={(e) => setProfileQuery(e.target.value)}
                      className="mb-2"
                    />

                    <div className="max-h-40 overflow-y-auto">
                      {filteredDraftProfiles.length > 0 ? (
                        filteredDraftProfiles.map((p) => {
                          const id = p._id;
                          const checked = selectedDraftProfiles.includes(id);
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-md cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProfile(id)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className="p-2 text-sm text-gray-500">
                          No profiles found
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Add profile..."
                        value={profileQuery}
                        onChange={(e) => setProfileQuery(e.target.value)}
                      />
                      <Button
                        onClick={() => handleAddProfile(profileQuery)}
                        disabled={adding || !profileQuery.trim()}
                      >
                        {adding ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select onValueChange={setTimezone} value={timezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Eastern Time (ET)" />
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
                <div className="flex items-center rounded-md p-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <Input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && v < minDateTime) {
                        setStartDateTime(minDateTime);
                      } else {
                        setStartDateTime(v);
                      }
                      if (endDateTime && v && endDateTime <= v) {
                        setEndDateTime("");
                      }
                    }}
                    min={minDateTime}
                    placeholder="Pick date and time"
                    aria-label="Start date and time"
                  />
                </div>
              </div>
              <div>
                <Label>End Date & Time</Label>
                <div className="flex items-center rounded-md p-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <Input
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => {
                      const v = e.target.value;
                      const allowedMin = startDateTime || minDateTime;
                      if (v && v < allowedMin) {
                        setEndDateTime(allowedMin);
                      } else {
                        setEndDateTime(v);
                      }
                    }}
                    min={startDateTime || minDateTime}
                    placeholder="Pick date and time"
                    aria-label="End date and time"
                  />
                </div>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
              onClick={createEvent}
            >
              Create Event
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>View in Timezone</Label>
              <Select onValueChange={setTimezone} value={timezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Eastern Time (ET)" />
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

            <div className="mt-4">
              <div className="h-96 overflow-auto pr-2">
                {eventsLoading ? (
                  <div className="mt-20 text-center text-gray-500">
                    Loading events...
                  </div>
                ) : events.length === 0 ? (
                  <div className="mt-20 text-center text-gray-500">
                    No events found
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {events.map((ev) => (
                      <EventCard
                        key={ev._id}
                        event={ev}
                        onEdit={() => handleEditEvent(ev)}
                        onViewLogs={() => handleViewLogs(ev)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {showLogsDialog && activeEvent && (
        <LogsDialog
          open={showLogsDialog}
          onOpenChange={setShowLogsDialog}
          event={activeEvent}
        />
      )}

      {showUpdateDialog && activeEvent && (
        <UpdateEventDialog
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
          event={activeEvent}
          onUpdate={async (patch) => {
            await updateEvent(activeEvent._id, patch);
            setShowUpdateDialog(false);
          }}
        />
      )}
    </div>
  );
}
