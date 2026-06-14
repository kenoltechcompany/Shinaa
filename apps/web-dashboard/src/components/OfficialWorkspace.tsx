import { useState, useEffect, DragEvent, ChangeEvent, FormEvent } from "react";

interface OfficialWorkspaceProps {
  token: string;
}

interface RoomOption {
  id: string;
  name: string;
  roomType: string;
}

export default function OfficialWorkspace({ token }: OfficialWorkspaceProps) {
  // Rooms state for the selector
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  // CSV Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; errors: Record<string, string[]> }>>([]);

  // Event Log States
  const [eventId, setEventId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventStatus, setEventStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [eventMessage, setEventMessage] = useState("");

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const response = await fetch("/api/rooms/availability");
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (err) {
      console.error("Error loading rooms:", err);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Drag-and-drop CSV handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadCSV = async (file: File) => {
    setUploadStatus("uploading");
    setUploadErrors([]);
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/schedules/upload-csv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadStatus("error");
        setUploadMessage(data.error || "Failed to upload CSV file");
        if (data.details) {
          setUploadErrors(data.details);
        }
      } else {
        setUploadStatus("success");
        setUploadMessage(data.message || "CSV schedule uploaded successfully!");
        fetchRooms(); // refresh in case new rooms were processed
      }
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage("Network error during file upload. Please verify backend API.");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        uploadCSV(file);
      } else {
        setUploadStatus("error");
        setUploadMessage("Invalid file format. Please drop a valid .csv file.");
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadCSV(e.target.files[0]);
    }
  };

  // Event Log submission
  const handleEventSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEventStatus("loading");
    setEventMessage("");

    if (!eventId || !eventTitle || !eventDate || !eventStartTime || !eventEndTime) {
      setEventStatus("error");
      setEventMessage("All event fields are required");
      return;
    }

    try {
      const response = await fetch("/api/schedules/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: eventId,
          title: eventTitle,
          specificDate: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEventStatus("error");
        if (data.errors) {
          const firstErrField = Object.keys(data.errors)[0];
          setEventMessage(`${firstErrField}: ${data.errors[firstErrField][0]}`);
        } else {
          setEventMessage(data.error || "Failed to book event");
        }
      } else {
        setEventStatus("success");
        setEventMessage(data.message || "One-time event logged successfully!");
        // Reset form
        setEventTitle("");
        setEventDate("");
        setEventStartTime("");
        setEventEndTime("");
      }
    } catch (err) {
      setEventStatus("error");
      setEventMessage("Network error occurred. Please verify backend API.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CSV upload card */}
      <section className="bg-white border border-[#D0D7DE] rounded-md p-6 shadow-sm">
        <h2 className="font-semibold text-lg text-[#1F2328] mb-1">Timetable Upload</h2>
        <p className="text-sm text-[#656D76] mb-4">
          Upload a CSV containing the weekly recurring class timetables.
        </p>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-md p-8 text-center flex flex-col items-center justify-center min-h-[200px] transition-colors cursor-pointer ${
            dragActive ? "border-[#0969DA] bg-blue-50/20" : "border-[#D0D7DE] hover:bg-gray-50/50"
          }`}
        >
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
            <svg
              className="w-8 h-8 text-[#656D76] mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-sm font-medium text-[#1F2328]">
              Drag and drop your CSV timetable here, or <span className="text-[#0969DA] underline">browse</span>
            </span>
            <span className="text-xs text-[#656D76] mt-1">
              Required headers: room_name, title, day_of_week, start_time, end_time
            </span>
          </label>
        </div>

        {/* Upload Status messages */}
        {uploadStatus === "uploading" && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm">
            Processing and uploading timetable...
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
            {uploadMessage}
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
              {uploadMessage}
            </div>

            {uploadErrors.length > 0 && (
              <div className="border border-[#D0D7DE] rounded-md overflow-hidden max-h-[220px] overflow-y-auto bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold">
                    <tr>
                      <th className="px-3 py-1.5 w-16">Row</th>
                      <th className="px-3 py-1.5">Parsing Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
                    {uploadErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 font-medium">{err.row}</td>
                        <td className="px-3 py-1.5">
                          {Object.keys(err.errors).map((field) => (
                            <div key={field}>
                              <span className="font-semibold capitalize">{field}:</span>{" "}
                              {err.errors[field].join(", ")}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* One-off event booking card */}
      <section className="bg-white border border-[#D0D7DE] rounded-md p-6 shadow-sm">
        <h2 className="font-semibold text-lg text-[#1F2328] mb-1">Log One-Time Event</h2>
        <p className="text-sm text-[#656D76] mb-4">
          Reserve classrooms or auditories for hackathons, guest lectures, or special exams.
        </p>

        <form onSubmit={handleEventSubmit} className="flex flex-col gap-4">
          {eventStatus === "success" && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
              {eventMessage}
            </div>
          )}

          {eventStatus === "error" && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
              {eventMessage}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-select" className="text-xs font-semibold text-[#1F2328]">
              Target Room
            </label>
            <select
              id="room-select"
              required
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="border border-[#D0D7DE] bg-white rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              disabled={roomsLoading}
            >
              <option value="">-- Choose a campus room --</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.roomType})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-title" className="text-xs font-semibold text-[#1F2328]">
              Event Title
            </label>
            <input
              id="event-title"
              type="text"
              required
              placeholder="e.g., Google Tech Talk / Hackathon 2026"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-date" className="text-xs font-semibold text-[#1F2328]">
              Date
            </label>
            <input
              id="event-date"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-start-time" className="text-xs font-semibold text-[#1F2328]">
                Start Time
              </label>
              <input
                id="event-start-time"
                type="text"
                required
                placeholder="09:00"
                pattern="\d{2}:\d{2}"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
                className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-end-time" className="text-xs font-semibold text-[#1F2328]">
                End Time
              </label>
              <input
                id="event-end-time"
                type="text"
                required
                placeholder="11:00"
                pattern="\d{2}:\d{2}"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
                className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={eventStatus === "loading"}
            className="bg-[#0969DA] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0353A4] transition-colors w-full cursor-pointer disabled:opacity-50 mt-2"
          >
            {eventStatus === "loading" ? "Booking..." : "Book Room"}
          </button>
        </form>
      </section>
    </div>
  );
}
