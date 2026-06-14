import { useState, useEffect } from "react";
import Login from "./components/Login.tsx";
import CaretakerWorkspace from "./components/CaretakerWorkspace.tsx";
import OfficialWorkspace from "./components/OfficialWorkspace.tsx";

interface TokenPayload {
  id: string;
  email: string;
  role: "official" | "caretaker";
  name: string;
  exp: number;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload) as TokenPayload;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("shinaa_token"));
  const [user, setUser] = useState<TokenPayload | null>(null);

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      // Check expiration (exp is in seconds, Date.now() in ms)
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser(decoded);
      } else {
        // Token expired or malformed
        handleLogout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const handleLogin = (newToken: string) => {
    localStorage.setItem("shinaa_token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("shinaa_token");
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans">
      {/* Header bar inspired by GitHub Primer */}
      <header className="bg-white border-b border-[#D0D7DE] py-3 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg text-[#1F2328]">Shinaa</span>
          <span className="text-xs px-2 py-0.5 border border-[#D0D7DE] rounded-full text-[#656D76] bg-[#F6F8FA] font-medium capitalize">
            {user.role} Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-[#1F2328]">{user.name}</p>
            <p className="text-xs text-[#656D76]">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-[#F6F8FA] border border-[#D0D7DE] text-[#24292F] px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#F3F4F6] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Workspace view router based on user role */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {user.role === "official" ? (
          <OfficialWorkspace token={token} />
        ) : (
          <CaretakerWorkspace token={token} />
        )}
      </main>
    </div>
  );
}
