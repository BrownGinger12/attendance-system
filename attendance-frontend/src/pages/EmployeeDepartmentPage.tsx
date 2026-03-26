import React, { useEffect, useState } from "react";
import {
  Users, Pencil, Check, X, UserPlus, Search,
  Trash2, Building2, Crown, ChevronRight, Plus,
  Loader2, CheckCircle2, Lock,
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
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const fetchCandidates = async (term: string) => {
    setSearching(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res  = await fetch(
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

// ── Member skeleton ───────────────────────────────────────────────────────────
const MemberSkeleton = () => (
  <li className="flex items-center gap-3 px-6 py-3.5">
    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-32 bg-slate-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-2.5 w-20 bg-slate-100 dark:bg-gray-600 rounded animate-pulse" />
    </div>
  </li>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeDepartmentPage: React.FC<Props> = ({ employee }) => {
  const isDeptHead = employee?.role === "department_head";
  const parentDeptName = employee?.department ?? "Unknown Department";

  const [subDept, setSubDept]           = useState<SubDept | null>(null);
  const [loading, setLoading]           = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);

  const [editingName, setEditingName]   = useState(false);
  const [draftName, setDraftName]       = useState("");
  const [nameSaving, setNameSaving]     = useState(false);
  const [nameSuccess, setNameSuccess]   = useState(false);
  const [nameError, setNameError]       = useState<string | null>(null);

  const [creating, setCreating]         = useState(false);
  const [createDraft, setCreateDraft]   = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [removeId, setRemoveId]         = useState<number | null>(null);
  const [removingId, setRemovingId]     = useState<number | null>(null);

  const token = () => localStorage.getItem("employeeToken") ?? "";

  // ── load sub-dept + members ───────────────────────────────────────────────
  useEffect(() => {
    if (!isDeptHead) { setLoading(false); return; }
    (async () => {
      try {
        const res  = await fetch(`${API_URL}/sub-department/my`, { headers: { "x-access-token": token() } });
        const data = await res.json();
        if (data.statusCode === 200 && data.data) {
          const sd = data.data;
          setSubDept({ ...sd, members: [] });
          // fetch members separately so we can show skeleton
          setMembersLoading(true);
          const mr   = await fetch(`${API_URL}/sub-department/my`, { headers: { "x-access-token": token() } });
          const md   = await mr.json();
          if (md.statusCode === 200 && md.data) setSubDept(md.data);
        }
      } catch { /* none yet */ }
      finally { setLoading(false); setMembersLoading(false); }
    })();
  }, [isDeptHead]);

  // ── create: auto-add dept head as first member ────────────────────────────
  const handleCreate = async () => {
    const name = createDraft.trim();
    if (!name) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const res  = await fetch(`${API_URL}/sub-department`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": token() },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create");

      const newId = data.id;

      // Auto-add the dept head (current employee) as first member
      if (employee?.id) {
        await fetch(`${API_URL}/sub-department/${newId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-access-token": token() },
          body: JSON.stringify({ employee_id: employee.id }),
        });
      }

      // Reload full sub-dept with members
      const r2  = await fetch(`${API_URL}/sub-department/my`, { headers: { "x-access-token": token() } });
      const d2  = await r2.json();
      if (d2.statusCode === 200 && d2.data) setSubDept(d2.data);
      setCreating(false);
      setCreateDraft("");
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreateSaving(false); }
  };

  // ── rename ────────────────────────────────────────────────────────────────
  const handleRename = async () => {
    const name = draftName.trim();
    if (!name || !subDept) return;
    setNameSaving(true);
    setNameError(null);
    try {
      const res  = await fetch(`${API_URL}/sub-department/${subDept.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-access-token": token() },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to rename");
      setSubDept((prev) => prev ? { ...prev, name } : prev);
      setEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (e: any) { setNameError(e.message); }
    finally { setNameSaving(false); }
  };

  // ── remove member ─────────────────────────────────────────────────────────
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

  // ── access guard ──────────────────────────────────────────────────────────
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

      {/* ── Sub-department card ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Sub-department</h2>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400">
            {parentDeptName}
          </span>
          {subDept && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-gray-600" />
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                {subDept.name}
              </span>
            </>
          )}
        </div>

        {/* No sub-dept yet */}
        {!subDept && !creating && (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-gray-600 p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-3">
              You don't have a sub-department yet.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create sub-department
            </button>
          </div>
        )}

        {/* Create form */}
        {!subDept && creating && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5">
                Sub-department name
              </label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Grade 10 – Section A"
                value={createDraft}
                onChange={(e) => setCreateDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setCreateDraft(""); } }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={createSaving || !createDraft.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {createSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setCreateDraft(""); setCreateError(null); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rename form */}
        {subDept && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5">
                Sub-department name
              </label>
              {editingName ? (
                <input
                  autoFocus
                  type="text"
                  value={draftName}
                  onChange={(e) => { setDraftName(e.target.value); setNameError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditingName(false); setNameError(null); } }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{subDept.name}</span>
                  <button
                    onClick={() => { setDraftName(subDept.name); setEditingName(true); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 dark:text-gray-500 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            {editingName && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRename}
                  disabled={nameSaving || !draftName.trim() || draftName.trim() === subDept.name}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {nameSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save changes
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameError(null); }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {nameSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Members card ────────────────────────────────────────────────── */}
      {subDept && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Members</h2>
              {!membersLoading && (
                <span className="text-xs text-slate-400 dark:text-gray-500">{subDept.members.length}</span>
              )}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          {membersLoading ? (
            <ul>
              {[...Array(3)].map((_, i) => <MemberSkeleton key={i} />)}
            </ul>
          ) : subDept.members.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-slate-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">No members yet</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                Add employees from {parentDeptName}
              </p>
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

                    {/* Can't remove yourself (dept head) */}
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
