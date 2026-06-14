import { useState, useEffect, useRef, FormEvent } from "react";

interface CaretakerWorkspaceProps {
  token: string;
}

interface ActiveLog {
  studentName: string;
  studentId: string;
  phoneNumber: string;
}

interface Room {
  id: string;
  name: string;
  roomType: string;
  isKeyAvailable: boolean;
  key: {
    id: string;
    isAvailable: boolean;
    lastUpdated: string;
    activeLog: ActiveLog | null;
  } | null;
}

export default function CaretakerWorkspace({ token }: CaretakerWorkspaceProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checkout Modal State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
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
      const response = await fetch("/api/rooms/availability");
      if (!response.ok) {
        throw new Error("Failed to load room status");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading room status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Auto-focus name field on modal open
  useEffect(() => {
    let timer: any;
    if (selectedRoom) {
      // Small timeout to guarantee DOM is rendered before focus
      timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedRoom]);

  const openCheckoutModal = (room: Room) => {
    if (!room.key || !room.isKeyAvailable) return;
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
    if (!selectedRoom?.key) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch(`/api/keys/${selectedRoom.key.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName,
          studentId,
          phoneNumber,
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

      closeCheckoutModal();
      fetchRooms(); // refresh grid
    } catch (err: any) {
      setCheckoutError(err.message || "Something went wrong.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReturnKey = async (keyId: string) => {
    if (!confirm("Are you sure this key is returned?")) return;

    try {
      const response = await fetch(`/api/keys/${keyId}/return`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to return key");
      }

      fetchRooms(); // refresh grid
    } catch (err: any) {
      alert(err.message || "Error returning key");
    }
  };

  return (
    <div className="bg-white border border-[#D0D7DE] rounded-md shadow-sm">
      <div className="p-4 border-b border-[#D0D7DE] flex justify-between items-center bg-[#F6F8FA] rounded-t-md">
        <div>
          <h2 className="font-semibold text-lg text-[#1F2328]">Key Ledger</h2>
          <p className="text-xs text-[#656D76] mt-0.5">
            Click available rooms to checkout keys, or click Done to return.
          </p>
        </div>
        <button
          onClick={fetchRooms}
          className="bg-white border border-[#D0D7DE] text-[#24292F] px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold text-xs">
              <th className="px-4 py-3">Room Name</th>
              <th className="px-4 py-3">Room Type</th>
              <th className="px-4 py-3 w-40">Key Status</th>
              <th className="px-4 py-3">Active Holder Phone</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
            {rooms.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-sm text-[#656D76]">
                  No campus rooms found. Please contact the administrator.
                </td>
              </tr>
            )}

            {rooms.map((room) => {
              const isAvailable = room.isKeyAvailable;
              const activeLog = room.key?.activeLog;

              return (
                <tr
                  key={room.id}
                  className={`hover:bg-gray-50/50 transition-colors ${
                    isAvailable ? "cursor-pointer" : ""
                  }`}
                  onClick={() => isAvailable && openCheckoutModal(room)}
                >
                  <td className="px-4 py-3.5 font-semibold text-[#1F2328]">{room.name}</td>
                  <td className="px-4 py-3.5 text-xs text-[#656D76] capitalize">
                    {room.roomType}
                  </td>
                  <td className="px-4 py-3.5">
                    {isAvailable ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        In Locker
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Checked Out
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#656D76]">
                    {activeLog ? (
                      <div>
                        <span className="font-sans text-sm text-[#1F2328] block font-medium">
                          {activeLog.studentName}
                        </span>
                        <span className="block mt-0.5">{activeLog.phoneNumber}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {isAvailable ? (
                      <button
                        onClick={() => openCheckoutModal(room)}
                        className="bg-[#0969DA] text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-[#0353A4] transition-colors"
                      >
                        Checkout
                      </button>
                    ) : (
                      room.key && (
                        <button
                          onClick={() => handleReturnKey(room.key!.id)}
                          className="bg-[#1F883D] text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-[#1A7F37] transition-colors"
                        >
                          Mark Done
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Checkout Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D0D7DE] rounded-md p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#D0D7DE]">
              <h3 className="font-semibold text-lg text-[#1F2328]">
                Checkout Key: Room {selectedRoom.name}
              </h3>
              <button
                onClick={closeCheckoutModal}
                className="text-[#656D76] hover:text-[#1F2328] text-xl font-semibold"
              >
                &times;
              </button>
            </div>

            {checkoutError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4 font-medium">
                {checkoutError}
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
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
                  className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
                  placeholder="e.g., Jane Doe"
                  disabled={checkoutLoading}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="student-id" className="text-xs font-semibold text-[#1F2328]">
                  Student ID
                </label>
                <input
                  id="student-id"
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
                  placeholder="e.g., STU12345"
                  disabled={checkoutLoading}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="student-phone" className="text-xs font-semibold text-[#1F2328]">
                  Phone Number
                </label>
                <input
                  id="student-phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
                  placeholder="e.g., +1234567890"
                  disabled={checkoutLoading}
                />
              </div>

              <div className="flex gap-3 mt-2 justify-end">
                <button
                  type="button"
                  onClick={closeCheckoutModal}
                  className="bg-[#F6F8FA] border border-[#D0D7DE] text-[#24292F] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#F3F4F6] transition-colors"
                  disabled={checkoutLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="bg-[#1F883D] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#1A7F37] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {checkoutLoading ? "Registering..." : "Mark Taken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
