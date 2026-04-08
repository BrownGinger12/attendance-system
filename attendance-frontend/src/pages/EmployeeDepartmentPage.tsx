import React, { useEffect, useState } from "react";
import { Users, Building2, Crown, Loader2, Lock } from "lucide-react";
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

const roleBadgeCls = (role: string | null) => {
  if (role === "admin")
    return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  if (role === "department_head")
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  return "bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-gray-600";
};
const roleLabel = (role: string | null) => {
  if (!role || role === "employee") return "Employee";
  if (role === "department_head") return "Dept. Head";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const EmployeeDepartmentPage: React.FC<Props> = ({ employee }) => {
  const isDeptHead = employee?.role === "department_head";
  const deptName = employee?.department ?? "Unknown Department";
  const deptId = employee?.dept_id;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDeptHead || !deptId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/employees/department/${deptId}`);
        console.log("Department members response:", res);
        const data = await res.json();
        if (data.statusCode === 200 && data.data) {
          setMembers(
            data.data.map((e: any) => ({
              userid: e.userid,
              name: e.name ?? e.Name,
              badge: e.badgenumber ?? e.Badgenumber,
              role: e.role ?? null,
              avatar_url: e.avatar_url ?? null,
            })),
          );
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [isDeptHead, deptId]);

  if (!isDeptHead) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-slate-400 dark:text-gray-500" />
          </div>
          <h2 className="text-base font-bold text-slate-700 dark:text-white mb-1">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-400 dark:text-gray-500">
            Only department heads can view this page.
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
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">
        My Department
      </h1>

      {/* Department info card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-gray-500 font-medium">
              Department
            </p>
            <p className="text-base font-bold text-slate-800 dark:text-white">
              {deptName}
            </p>
          </div>
        </div>
      </div>

      {/* Members card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <Users className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Members
          </h2>
          <span className="text-xs text-slate-400 dark:text-gray-500">
            {members.length}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-slate-400 dark:text-gray-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              No members found
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-gray-700/50">
            {members.map((m) => {
              const isMe = m.userid === employee?.id;
              return (
                <li
                  key={m.userid}
                  className="flex items-center gap-3 px-6 py-3.5"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {m.avatar_url ? (
                      <img
                        src={`${API_URL}${m.avatar_url}`}
                        alt={m.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      m.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {m.name}
                      </span>
                      {isMe && (
                        <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 dark:text-gray-500">
                        {m.badge}
                      </span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeCls(m.role)}`}
                      >
                        {roleLabel(m.role)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EmployeeDepartmentPage;
