import React, { useEffect, useState } from "react";
import {
  Users, X, UserPlus, Search,
  Trash2, Building2, Crown, Check,
  Loader2, Lock,
} from "lucide-react";
import { createPortal, useScrollLock } from "../hooks/useModalPortal";
import { EmployeeInfo } from "../types/dashboard";

const API_URL = import.meta.env.VITE_API_URL;

interface Props {
  employee: EmployeeInfo | null;
}

interface Member {
  userid: number;
  name: string;
  badge: string;
  role: string | null;
  avatar_url: string | null;
}

interface SubDept {
  id: number;
  name: string;
  parent_dept_id: number;
  parent_dept_name: string;
  members: Member[];
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
interface AddModalProps {
  show: boolean;
  subDeptId: number;
  onAdded: (m: Member) => void;
  onClose: () => void;
}

const AddMemberModal: React.FC<AddModalProps> = ({ show, subDeptId, onAdded, onClose }) => {
  useScrollLock(show);
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId]   = useState<number | null>(null);

  const fetchCandidates = async (term: string) => {
    setSearching(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res   = await fetch(
        `${API_URL}/sub-department/${subDeptId}/candidates?q=${encodeURIComponent(term)}`,
        { headers: { "x-access-token": token ?? "" } },
      );
      const data = await res.json();
      setResults(data.data ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  useEffect(() => { if (show) fetchCandidates(""); }, [show, subDeptId]);
  useEffect(() => {
    const t = setTimeout(() => fetchCandidates(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleAdd = async (m: Member) => {
    setAddingId(m.userid);
    try {
      const token = localStorage.getItem("employeeToken");
      await fetch(`${API_URL}/sub-department/${subDeptId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": token ?? "" },
        body: JSON.stringify({ employee_id: m.userid }),
      });
      onAdded(m);
      onClose();
    } catch { /* ignore */ }
    finally { setAddingId(null); }
  };

  if (!show) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Add Member</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or badge..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72 px-4 pb-4 space-y-1">
          {searching ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">
              {query.trim() ? "No employees match your search" : "No available employees in this department"}
            </p>
          ) : results.map((m) => (
            <button
              key={m.userid}
              onClick={() => handleAdd(m)}
              disabled={addingId === m.userid}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                {m.avatar_url
                  ? <img src={`${API_URL}${m.avatar_url}`} alt={m.name} className="w-full h-full object-cover" />
                  : m.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{m.name}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500">{m.badge}</p>
              </div>
              {addingId === m.userid
                ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                : <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const roleBadgeCls = (role: string | null) => {
  if (role === "admin")           return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  if (role === "department_head") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  return "bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-gray-600";
};
const roleLabel = (role: string | null) => {
  if (!role || role === "employee") return "Employee";
  if (role === "department_head")   return "Dept. Head";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeDepartmentPage: React.FC<Props> = ({ employee }) => {
  const isDeptHead     = employee?.role === "department_head";
  const parentDeptName = employee?.department ?? "Unknown Department";

  const [subDept, setSubDept]               = useState<SubDept | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [removeId, setRemoveId]         = useState<number | null>(null);
  const [removingId, setRemovingId]     = useState<number | null>(null);

  const token = () => localStorage.getItem("employeeToken") ?? "";

  useEffect(() => {
    if (!isDeptHead) { setLoading(false); return; }
    (async () => {
      try {
        const res  = await fetch(`${API_URL}/sub-department/my`, { headers: { "x-access-token": token() } });
        const data = await res.json();
        if (data.statusCode === 200 && data.data) setSubDept(data.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [isDeptHead]);

  const handleRemove = async (employeeId: number) => {
    if (!subDept) return;
    setRemovingId(employeeId);
    try {
      await fetch(`${API_URL}/sub-department/${subDept.id}/members/${employeeId}`, {
        method: "DELETE",
        headers: { "x-access-token": token() },
      });
      setSubDept((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.userid !== employeeId) } : prev);
      setRemoveId(null);
    } catch { /* ignore */ }
    finally { setRemovingId(null); }
  };

  const handleMemberAdded = (m: Member) =>
    setSubDept((prev) => prev ? { ...prev, members: [...prev.members, m] } : prev);

  if (!isDeptHead) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-slate-400 dark:text-gray-500" />
          </div>
          <h2 className="text-base font-bold text-slate-700 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-sm text-slate-400 dark:text-gray-500">
            Only department heads can manage sub-departments.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">My Department</h1>

      {/* Department info card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-gray-500 font-medium">Department</p>
            <p className="text-base font-bold text-slate-800 dark:text-white">{parentDeptName}</p>
          </div>
        </div>
      </div>

      {/* Members card */}
      {subDept && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Members</h2>
              <span className="text-xs text-slate-400 dark:text-gray-500">{subDept.members.length}</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          {subDept.members.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-slate-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">No members yet</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Add employees from {parentDeptName}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-gray-700/50">
              {subDept.members.map((m) => {
                const isHead = m.userid === employee?.id;
                return (
                  <li key={m.userid} className="flex items-center gap-3 px-6 py-3.5 group hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                      {m.avatar_url
                        ? <img src={`${API_URL}${m.avatar_url}`} alt={m.name} className="w-full h-full object-cover" />
                        : m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{m.name}</span>
                        {isHead && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 dark:text-gray-500">{m.badge}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeCls(m.role)}`}>
                          {roleLabel(m.role)}
                        </span>
                      </div>
                    </div>

                    {isHead ? (
                      <span className="flex-shrink-0 text-xs text-slate-300 dark:text-gray-600">Head</span>
                    ) : removeId === m.userid ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRemove(m.userid)}
                          disabled={removingId === m.userid}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
                        >
                          {removingId === m.userid
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setRemoveId(null)}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRemoveId(m.userid)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <AddMemberModal
        show={showAddModal}
        subDeptId={subDept?.id ?? 0}
        onAdded={handleMemberAdded}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default EmployeeDepartmentPage;
