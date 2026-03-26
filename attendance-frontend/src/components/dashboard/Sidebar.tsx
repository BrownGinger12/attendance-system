import React from "react";
import { Home, LogOut, X, Settings, Users } from "lucide-react";
import { EmployeeInfo } from "../../types/dashboard";

interface Props {
  employee: EmployeeInfo | null;
  sidebarOpen: boolean;
  activePage?: string;
  onClose: () => void;
  onLogout: () => void;
  onPageChange?: (page: string) => void;
  onProfileClick?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL;

const Sidebar: React.FC<Props> = ({ employee, sidebarOpen, activePage = "home", onClose, onLogout, onPageChange, onProfileClick }) => {
  const go = (page: string) => {
    onPageChange?.(page);
    onClose();
  };

  const navCls = (page: string) =>
    `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
      activePage === page
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700"
    }`;

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transform transition-transform duration-200
          bg-white dark:bg-gray-800 border-r border-slate-100 dark:border-gray-700
          md:relative md:inset-auto md:z-auto md:translate-x-0 md:shadow-none
          ${sidebarOpen ? "translate-x-0 shadow-lg" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}deped_logo.png`} alt="DepEd" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">DepEd</p>
              <p className="text-xs text-slate-400 dark:text-gray-400">Employee Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee info */}
        <div className="px-4 py-4 border-b border-slate-100 dark:border-gray-700">
          <button onClick={() => { go("home"); onProfileClick?.(); }} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-left">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm overflow-hidden">
              {employee?.avatar_url
                ? <img src={`${API_URL}${employee.avatar_url}`} alt={employee.name} className="w-full h-full object-cover" />
                : employee?.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{employee?.name}</p>
              <p className="text-xs text-slate-400 dark:text-gray-400 truncate">{employee?.department}</p>
            </div>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          <button onClick={() => go("home")} className={navCls("home")}>
            <Home className="w-5 h-5 flex-shrink-0" />
            Home
          </button>
          {employee?.role === "department_head" && (
            <button onClick={() => go("department")} className={navCls("department")}>
              <Users className="w-5 h-5 flex-shrink-0" />
              Department
            </button>
          )}
          <button onClick={() => go("settings")} className={navCls("settings")}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            Settings
          </button>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-gray-700">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
