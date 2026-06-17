import { useState, useEffect, useRef, FormEvent } from "react";
import RoomCard, { RoomData } from "./RoomCard.tsx";
import { Search, X, UserCheck, Smartphone, Hash } from "lucide-react";

interface CaretakerWorkspaceProps {
  token: string;
}

export default function CaretakerWorkspace({ token }: CaretakerWorkspaceProps) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms");
      if (!response.ok) {
        throw new Error("Failed to load room statuses");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading room status.");
    } finally {
      setLoading(false);
    }
  };

  const refreshRoomsAndSelect = async (currentSelectedId?: string) => {
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        if (currentSelectedId) {
          const updatedSelected = data.find((r: RoomData) => r.id === currentSelectedId);
          if (updatedSelected) {
            setSelectedRoom(updatedSelected);
          }
        }
      }
    } catch (err) {
      console.error("Error refreshing room list:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Focus name field when modal opens
  useEffect(() => {
    if (selectedRoom) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [selectedRoom]);

  const openCheckoutModal = (room: RoomData) => {
    setSelectedRoom(room);
    setStudentName("");
    setStudentId("");
    setPhoneNumber("");
    setCheckoutError(null);
  };

  const closeCheckoutModal = () => {
    setSelectedRoom(null);
    setCheckoutError(null);
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const keyId = selectedRoom?.keys?.[0]?.id;
    if (!keyId) {
      setCheckoutError("No physical key registered for this lecture hall.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch(`/api/keys/${keyId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentId: studentId.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const firstErrField = Object.keys(data.errors)[0];
          throw new Error(`${firstErrField}: ${data.errors[firstErrField][0]}`);
        }
        throw new Error(data.error || "Failed to check out key");
      }

      // Reset form fields but keep modal open to allow consecutive checkouts if needed
      setStudentName("");
      setStudentId("");
      setPhoneNumber("");
      await refreshRoomsAndSelect(selectedRoom.id);
    } catch (err: any) {
      setCheckoutError(err.message || "Something went wrong.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReturnKeyLog = async (logId: string) => {
    const keyId = selectedRoom?.keys?.[0]?.id;
    if (!keyId) return;

    try {
      const response = await fetch(`/api/keys/${keyId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          logId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to log key return");
      }

      await refreshRoomsAndSelect(selectedRoom.id);
    } catch (err: any) {
      alert(err.message || "Error returning key");
    }
  };

  // Filter & Sort Logic:
  // 1. Filter by search query.
  // 2. Sort so that rooms which are "Taken" (active keyLogs > 0) float to the top.
  // 3. Otherwise, sort alphabetically by room name.
  const filteredAndSortedRooms = rooms
    .filter((room) => room.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const activeA = a.keys?.[0]?.keyLogs?.length || 0;
      const activeB = b.keys?.[0]?.keyLogs?.length || 0;
      const isTakenA = activeA > 0;
      const isTakenB = activeB > 0;

      if (isTakenA && !isTakenB) return -1;
      if (!isTakenA && isTakenB) return 1;

      return a.name.localeCompare(b.name);
    });

  const activeLogs = selectedRoom?.keys?.[0]?.keyLogs || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Search Header (Sticky) */}
      <div className="sticky top-0 z-10 bg-[#F6F8FA] py-3 border-b border-[#D0D7DE]/30 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[#1F2328]">Key Ledger Panel</h2>
            <p className="text-xs text-[#656D76]">
              Filter lecture halls below. Click a card to manage student checkouts or return keys.
            </p>
          </div>
          <button
            onClick={fetchRooms}
            className="bg-white border border-[#D0D7DE] text-[#24292F] px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Catalog"}
          </button>
        </div>

        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#656D76]">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search rooms by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-[#D0D7DE] rounded-md pl-9 pr-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent bg-white shadow-2xs"
          />
        </div>
      </div>

      {loading && rooms.length === 0 && (
        <div className="bg-white border border-[#D0D7DE] rounded-md p-6 text-center text-sm text-[#656D76]">
          Loading campus keys status...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {/* Grid of rooms */}
      {!loading && filteredAndSortedRooms.length === 0 && (
        <div className="bg-white border border-[#D0D7DE] rounded-md p-8 text-center text-[#656D76] text-sm">
          No rooms found matching "{search}".
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            isReadOnly={false}
            onCardClick={() => openCheckoutModal(room)}
          />
        ))}
      </div>

      {/* Multi-Checkout Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D0D7DE] rounded-md p-6 max-w-lg w-full shadow-lg flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-[#D0D7DE]">
              <div>
                <h3 className="font-bold text-lg text-[#1F2328]">
                  Key Ledger: Room {selectedRoom.name}
                </h3>
                <span className="text-xs text-[#656D76] capitalize">
                  {selectedRoom.roomType.replace("_", " ")}
                </span>
              </div>
              <button
                onClick={closeCheckoutModal}
                className="text-[#656D76] hover:text-[#1F2328] p-1.5 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Part 1: Active Badges (The Ledger) */}
            <div>
              <h4 className="text-xs font-bold text-[#1F2328] uppercase tracking-wider mb-2">
                Active Checkouts ({activeLogs.length})
              </h4>
              {activeLogs.length === 0 ? (
                <p className="text-xs text-[#656D76] italic bg-[#F6F8FA] border border-dashed border-[#D0D7DE] p-3 rounded-md text-center">
                  Key is currently in locker (Available).
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {activeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between items-center bg-[#F6F8FA] border border-[#D0D7DE] rounded-md px-3 py-2 text-xs"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[#1F2328] flex items-center gap-1.5">
                          <UserCheck size={12} className="text-[#1F883D]" />
                          {log.studentName}
                        </span>
                        <span className="text-[#656D76] flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Hash size={10} />
                            {log.studentId}
                          </span>
                          <span className="flex items-center gap-1">
                            <Smartphone size={10} />
                            {log.phoneNumber}
                          </span>
                        </span>
                      </div>
                      <button
                        onClick={() => handleReturnKeyLog(log.id)}
                        className="text-[#656D76] hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                        title="Return Key"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Part 2: Input Form (Checkout) */}
            <div className="border-t border-[#D0D7DE] pt-4">
              <h4 className="text-xs font-bold text-[#1F2328] uppercase tracking-wider mb-3">
                New Key Checkout
              </h4>

              {checkoutError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4 font-medium">
                  {checkoutError}
                </div>
              )}

              <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="student-name" className="text-xs font-semibold text-[#1F2328]">
                    Student Name
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    required
                    ref={nameInputRef}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                    placeholder="e.g. Harry Potter"
                    disabled={checkoutLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-id" className="text-xs font-semibold text-[#1F2328]">
                      Student ID
                    </label>
                    <input
                      id="student-id"
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                      placeholder="e.g. STU12345"
                      disabled={checkoutLoading}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-phone" className="text-xs font-semibold text-[#1F2328]">
                      Phone Number
                    </label>
                    <input
                      id="student-phone"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm bg-white"
                      placeholder="e.g. +336123456"
                      disabled={checkoutLoading}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={closeCheckoutModal}
                    className="bg-[#F6F8FA] border border-[#D0D7DE] text-[#24292F] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                    disabled={checkoutLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="bg-[#1F883D] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1A7F37] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoading ? "Recording..." : "Mark Taken"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
