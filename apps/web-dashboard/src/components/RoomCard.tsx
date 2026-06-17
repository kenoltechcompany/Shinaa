import { useState, MouseEvent } from "react";
import { Eye, CalendarDays, X } from "lucide-react";

export interface ActiveLog {
  id: string;
  studentName: string;
  studentId: string;
  phoneNumber: string;
}

export interface RoomData {
  id: string;
  name: string;
  roomType: string;
  keys?: Array<{
    id: string;
    keyLogs?: Array<ActiveLog>;
  }>;
}

interface RoomCardProps {
  room: RoomData;
  isReadOnly: boolean;
  onCardClick?: () => void;
}

interface PeekSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  scheduleType: "recurring_class" | "one_time_event";
}

export default function RoomCard({ room, isReadOnly, onCardClick }: RoomCardProps) {
  const [showPeek, setShowPeek] = useState(false);
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekSlots, setPeekSlots] = useState<PeekSlot[]>([]);
  const [peekError, setPeekError] = useState<string | null>(null);

  const activeLogs = room.keys?.[0]?.keyLogs || [];
  const activeLogsCount = activeLogs.length;
  const isAvailable = activeLogsCount === 0;

  const handlePeekClick = async (e: MouseEvent) => {
    e.stopPropagation();
    if (showPeek) {
      setShowPeek(false);
      return;
    }

    setShowPeek(true);
    setPeekLoading(true);
    setPeekError(null);

    try {
      const response = await fetch(`/api/rooms/${room.id}/peek`);
      if (!response.ok) {
        throw new Error("Failed to load upcoming slots");
      }
      const data = await response.json();
      setPeekSlots(data);
    } catch (err: any) {
      setPeekError(err.message || "Error peeking schedules");
    } finally {
      setPeekLoading(false);
    }
  };

  const handleCardClick = () => {
    if (!isReadOnly && onCardClick) {
      onCardClick();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative p-4 border rounded-md flex justify-between items-center transition-all shadow-2xs ${
        isAvailable
          ? "bg-white border-[#D0D7DE]"
          : "bg-[#0969DA]/5 border-[#0969DA]/25"
      } ${!isReadOnly ? "cursor-pointer hover:shadow-xs hover:border-[#85B0E2]" : ""}`}
    >
      {/* Left Details */}
      <div className="flex flex-col gap-1">
        <h4 className="font-bold text-lg text-[#1F2328]">{room.name}</h4>
        <span className="text-xs text-[#656D76] capitalize font-medium">
          {room.roomType.replace("_", " ")}
        </span>
      </div>

      {/* Middle Status */}
      <div className="flex items-center gap-3">
        {isAvailable ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            Available
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {activeLogsCount === 1 ? "Taken" : `Taken (${activeLogsCount} concurrent)`}
          </span>
        )}
      </div>

      {/* Far Right Peek Trigger Button */}
      <div className="relative flex items-center pl-4 border-l border-[#D0D7DE]/50">
        <button
          onClick={handlePeekClick}
          className="bg-[#F6F8FA] border border-[#D0D7DE] text-[#24292F] hover:bg-[#F3F4F6] p-1.5 rounded-md cursor-pointer transition-colors shadow-2xs"
          title="Peek Schedule"
        >
          <Eye size={15} />
        </button>

        {/* Peek Popover */}
        {showPeek && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-10 z-30 w-64 bg-white border border-[#D0D7DE] rounded-md shadow-md p-3 text-left"
          >
            <div className="flex justify-between items-center border-b border-[#D0D7DE] pb-1.5 mb-2">
              <span className="font-semibold text-xs text-[#1F2328] flex items-center gap-1">
                <CalendarDays size={13} />
                Today's Upcoming
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPeek(false);
                }}
                className="text-[#656D76] hover:text-[#1F2328] font-bold text-xs"
              >
                <X size={12} />
              </button>
            </div>

            {peekLoading && (
              <div className="text-[11px] text-[#656D76] py-2 italic text-center">Loading next slots...</div>
            )}

            {peekError && (
              <div className="text-[11px] text-red-600 py-2 font-medium text-center">{peekError}</div>
            )}

            {!peekLoading && !peekError && peekSlots.length === 0 && (
              <div className="text-[11px] text-[#656D76] py-3 italic text-center">No more slots today.</div>
            )}

            {!peekLoading && !peekError && peekSlots.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {peekSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-1.5 border rounded-md text-[10px] leading-tight flex flex-col gap-0.5 ${
                      slot.scheduleType === "recurring_class"
                        ? "bg-blue-50 border-blue-100 text-blue-800"
                        : "bg-green-50 border-green-100 text-green-800"
                    }`}
                  >
                    <span className="font-bold truncate">{slot.title}</span>
                    <span className="font-medium font-mono text-[9px]">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
