import React, { useEffect, useRef, useState } from "react";
import { Users, X, Search } from "lucide-react";
import { createPortal, useScrollLock } from "../../hooks/useModalPortal";
import { EmployeeInfo } from "../../types/dashboard";

const API_URL = import.meta.env.VITE_API_URL;

interface TeamMember {
  userid: number;
  name: string;
  badge: string;
  role: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface Props {
  currentEmployee: EmployeeInfo | null;
  onViewMember: (member: EmployeeInfo) => void;
}

const TeamFloatingButton: React.FC<Props> = ({ currentEmployee, onViewMember }) => {
  const [open, setOpen]           = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [members, setMembers]     = useState<TeamMember[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetched, setFetched]     = useState(false);
  const [search, setSearch]       = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useScrollLock(open);

  // Animate panel in after mount
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setPanelVisible(true);
        searchRef.current?.focus();
      }));
    } else {
      setPanelVisible(false);
      setSearch("");
    }
  }, [open]);

  // Fetch members once on first open
  useEffect(() => {
    if (!open || fetched) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("employeeToken");
        const res   = await fetch(`${API_URL}/sub-department/membership`, {
          headers: { "x-access-token": token ?? "" },
        });
        const data  = await res.json();
        if (data.statusCode === 200 && data.data) {
          setMembers(data.data.members ?? []);
          setFetched(true);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [open]);

  const handleSelect = (m: TeamMember) => {
    // Close with animation first, then switch profile
    setPanelVisible(false);
    setTimeout(() => {
      setOpen(false);
      onViewMember({
        id: m.userid,
        badge: m.badge,
        name: m.name,
        department: currentEmployee?.department ?? "",
        avatar_url: m.avatar_url,
        role: m.role,
      });
    }, 180);
  };

  if (!currentEmployee) return null;

  // Everything is in a portal so position:fixed is never broken by a parent transform
  return createPortal(
    <>
      {/* Backdrop (only when open) */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Panel */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 z-50 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-gray-700 overflow-hidden
            transition-all duration-200 origin-bottom-right
            ${panelVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-3"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-slate-800 dark:text-white">Team</span>
              {!loading && (
                <span className="text-xs text-slate-400 dark:text-gray-500">{members.length}</span>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {members.filter((m) => m.is_online).length} online
            </span>
          </div>

          {/* Search */}
          {!loading && members.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 dark:border-gray-700">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members..."
                  className="flex-1 bg-transparent text-xs text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">
                No team members found
              </p>
            ) : (() => {
              const filtered = members.filter((m) =>
                m.name.toLowerCase().includes(search.toLowerCase())
              );
              return filtered.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">No results</p>
              ) : (
              <ul className="divide-y divide-slate-50 dark:divide-gray-700/50">
                {filtered.map((m) => {
                  const isMe = m.userid === currentEmployee.id;
                  return (
                    <li key={m.userid}>
                      <button
                        onClick={() => !isMe && handleSelect(m)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isMe ? "cursor-default" : "hover:bg-slate-50 dark:hover:bg-gray-700/50 active:bg-slate-100 dark:active:bg-gray-700"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {m.avatar_url
                              ? <img src={`${API_URL}${m.avatar_url}`} alt={m.name} className="w-full h-full object-cover" />
                              : m.name.charAt(0)}
                          </div>
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${
                            m.is_online ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${
                            isMe ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-white"
                          }`}>
                            {m.name}{isMe && " (You)"}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-gray-500">
                            {m.is_online ? "In office" : "Out"}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              );
            })()}
          </div>
        </div>
      )}

      {/* FAB — also in portal so position:fixed is never broken by parent transform */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 ${
          open ? "rotate-0" : ""
        }`}
        title="Team members"
      >
        <span className={`absolute transition-all duration-200 ${open ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75"}`}>
          <X className="w-6 h-6" />
        </span>
        <span className={`absolute transition-all duration-200 ${open ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`}>
          <Users className="w-6 h-6" />
        </span>
      </button>
    </>,
    document.body,
  );
};

export default TeamFloatingButton;
