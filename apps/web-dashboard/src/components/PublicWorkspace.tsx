import { useState, useEffect } from "react";
import RoomCard, { RoomData } from "./RoomCard.tsx";
import { Search } from "lucide-react";

export default function PublicWorkspace() {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms");
      if (!response.ok) {
        throw new Error("Failed to load room catalog");
      }
      const data = await response.json();
      setRooms(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading rooms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const navigateToLogin = () => {
    window.history.pushState(null, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
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

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans">
      {/* Header bar inspired by GitHub Primer */}
      <header className="bg-white border-b border-[#D0D7DE] py-3 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-[#1F2328]">Shinaa</span>
          <span className="text-xs px-2 py-0.5 border border-[#D0D7DE] rounded-full text-[#656D76] bg-[#F6F8FA] font-medium uppercase tracking-wider">
            Public View
          </span>
        </div>
        <button
          onClick={navigateToLogin}
          className="bg-[#0969DA] text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-[#0353A4] transition-colors cursor-pointer"
        >
          Staff Login
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        {/* Page Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#1F2328]">Lecture Hall Ledger</h1>
          <p className="text-sm text-[#656D76]">
            Real-time key checkouts and room statuses. Search below or peek schedules.
          </p>
        </div>

        {/* Sticky Search bar container */}
        <div className="sticky top-0 z-10 bg-[#F6F8FA] py-3 border-b border-[#D0D7DE]/30 flex flex-col gap-2">
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
            Fetching campus rooms data...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md text-sm font-medium">
            {error}
          </div>
        )}

        {/* Room cards grid */}
        {!loading && filteredAndSortedRooms.length === 0 && (
          <div className="bg-white border border-[#D0D7DE] rounded-md p-8 text-center text-[#656D76] text-sm">
            No rooms found matching "{search}".
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedRooms.map((room) => (
            <RoomCard key={room.id} room={room} isReadOnly={true} />
          ))}
        </div>
      </main>
    </div>
  );
}
