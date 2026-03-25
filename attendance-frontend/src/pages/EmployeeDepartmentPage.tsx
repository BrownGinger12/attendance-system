import React, { useState } from "react";
import {
  Users,
  Pencil,
  Check,
  X,
  UserPlus,
  Search,
  Trash2,
  Building2,
  Crown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { EmployeeInfo } from "../types/dashboard";

interface Props {
  employee: EmployeeInfo | null;
}

interface DeptMember {
  id: number;
  name: string;
  badge: string;
  role: string;
  avatar_url?: string | null;
  isInOffice: boolean;
}

// ── Simulated data ──────────────────────────────────────────────────────────
const MOCK_MEMBERS: DeptMember[] = [
  { id: 1, name: "Maria Santos",    badge: "10001", role: "employee",        isInOffice: true  },
  { id: 2, name: "Jose Reyes",      badge: "10002", role: "employee",        isInOffice: false },
  { id: 3, name: "Ana Cruz",        badge: "10003", role: "department_head", isInOffice: true  },
  { id: 4, name: "Pedro Dela Cruz", badge: "10004", role: "employee",        isInOffice: false },
];

const MOCK_SEARCH_POOL: DeptMember[] = [
  { id: 5, name: "Lorna Villanueva", badge: "10005", role: "employee", isInOffice: false },
  { id: 6, name: "Roberto Aquino",   badge: "10006", role: "employee", isInOffice: true  },
  { id: 7, name: "Carla Mendoza",    badge: "10007", role: "employee", isInOffice: false },
  { id: 8, name: "Edgar Flores",     badge: "10008", role: "employee", isInOffice: true  },
  { id: 9, name: "Teresita Garcia",  badge: "10009", role: "employee", isInOffice: false },
];
// ───────────────────────────────────────────────────────────────────────────

interface AddMemberModalProps {
  existingIds: number[];
  onAdd: (member: DeptMember) => void;
  onClose: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ existingIds, onAdd, onClose }) => {
  const [query, setQuery] = useState("");

  const results = MOCK_SEARCH_POOL.filter(
    (m) =>
      !existingIds.includes(m.id) &&
      (m.name.toLowerCase().includes(query.toLowerCase()) || m.badge.includes(query)),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Add Member</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors"
          >
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
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72 px-4 pb-4 space-y-1">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">
              {query ? "No employees found" : "Start typing to search"}
            </p>
          ) : (
            results.map((m) => (
              <button
                key={m.id}
                onClick={() => { onAdd(m); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{m.name}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500">{m.badge}</p>
                </div>
                <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const roleBadgeCls = (role: string) => {
  if (role === "admin")           return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  if (role === "department_head") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  return "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600";
};
const roleLabel = (role: string) =>
  role === "department_head" ? "Dept. Head" : role.charAt(0).toUpperCase() + role.slice(1);

// ── Main Page ────────────────────────────────────────────────────────────────
const EmployeeDepartmentPage: React.FC<Props> = ({ employee }) => {
  const parentDeptName = employee?.department ?? "Unknown Department";

  // null = no sub-dept created yet
  const [subDeptName, setSubDeptName]     = useState<string | null>(null);
  const [editingName, setEditingName]     = useState(false);
  const [draftName, setDraftName]         = useState("");
  const [members, setMembers]             = useState<DeptMember[]>(MOCK_MEMBERS);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [removeId, setRemoveId]           = useState<number | null>(null);

  const inOfficeCount = members.filter((m) => m.isInOffice).length;

  const saveSubDeptName = () => {
    const trimmed = draftName.trim();
    if (trimmed) setSubDeptName(trimmed);
    setEditingName(false);
  };

  const cancelEdit = () => {
    setDraftName(subDeptName ?? "");
    setEditingName(false);
  };

  const startCreate = () => {
    setDraftName("");
    setEditingName(true);
  };

  const startEdit = () => {
    setDraftName(subDeptName ?? "");
    setEditingName(true);
  };

  const addMember   = (m: DeptMember) => setMembers((prev) => [...prev, m]);
  const removeMember = (id: number)   => { setMembers((prev) => prev.filter((m) => m.id !== id)); setRemoveId(null); };

  return (
    <div className="min-h-full bg-[#f0f2f5] dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Breadcrumb / Header ────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-blue-500" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Breadcrumb: Parent → Sub */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs font-medium text-slate-400 dark:text-gray-500 truncate">
                  {parentDeptName}
                </span>
                {subDeptName && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-gray-600 flex-shrink-0" />
                    {editingName ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveSubDeptName(); if (e.key === "Escape") cancelEdit(); }}
                          placeholder="Sub-department name"
                          className="text-lg font-bold bg-transparent border-b-2 border-blue-400 text-slate-800 dark:text-white focus:outline-none min-w-0 w-48"
                        />
                        <button onClick={saveSubDeptName} className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-lg font-bold text-slate-800 dark:text-white truncate">{subDeptName}</span>
                        <button
                          onClick={startEdit}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 dark:text-gray-500 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* If no sub-dept yet, show the parent name as title */}
              {!subDeptName && !editingName && (
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">{parentDeptName}</h1>
              )}

              {/* Create sub-dept inline (first time) */}
              {!subDeptName && editingName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    autoFocus
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveSubDeptName(); if (e.key === "Escape") cancelEdit(); }}
                    placeholder="e.g. Grade 10 – Section A"
                    className="text-base font-semibold bg-transparent border-b-2 border-blue-400 text-slate-800 dark:text-white focus:outline-none min-w-0 w-56 placeholder:font-normal placeholder:text-slate-400"
                  />
                  <button onClick={saveSubDeptName} className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={cancelEdit} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Sub-dept stats / create button */}
              {subDeptName ? (
                <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">
                  {members.length} member{members.length !== 1 ? "s" : ""} &middot;{" "}
                  <span className="text-green-500 font-medium">{inOfficeCount} in office</span>
                </p>
              ) : !editingName ? (
                <button
                  onClick={startCreate}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create a sub-department
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Members Card ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500 dark:text-gray-400" />
              <h2 className="text-sm font-bold text-slate-700 dark:text-white">Members</h2>
              {subDeptName && (
                <span className="text-xs text-slate-400 dark:text-gray-500 font-normal">
                  — {subDeptName}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>

          {members.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-slate-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">No members yet</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Add employees to your department</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-gray-700/50">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden relative">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                      : m.name.charAt(0)
                    }
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${m.isInOffice ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{m.name}</span>
                      {m.role === "department_head" && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400 dark:text-gray-500">{m.badge}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeCls(m.role)}`}>
                        {roleLabel(m.role)}
                      </span>
                    </div>
                  </div>

                  {/* Status + Remove */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.isInOffice
                        ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                        : "bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500"
                    }`}>
                      {m.isInOffice ? <><span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> In Office</> : "Out"}
                    </span>

                    {removeId === m.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeMember(m.id)} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setRemoveId(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRemoveId(m.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-gray-600 pb-4">
          Showing simulated data &mdash; backend integration coming soon
        </p>
      </div>

      {showAddModal && (
        <AddMemberModal
          existingIds={members.map((m) => m.id)}
          onAdd={addMember}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export default EmployeeDepartmentPage;
