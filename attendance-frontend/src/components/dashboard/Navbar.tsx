import React, { useState } from "react";
import { Loader2, LogIn, LogOut, Menu, Sun, Moon } from "lucide-react";

interface Props {
  onMenuOpen: () => void;
  statusLoading: boolean;
  checkedIn: boolean;
  onAttendanceClick: () => void;
}

const Navbar: React.FC<Props> = ({
  onMenuOpen,
  statusLoading,
  checkedIn,
  onAttendanceClick,
}) => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="md:hidden text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-base font-bold text-blue-600 hidden sm:block">
          Employee Portal
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {statusLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-gray-500" />
        ) : checkedIn ? (
          <button
            onClick={onAttendanceClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Check Out</span>
          </button>
        ) : (
          <button
            onClick={onAttendanceClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Check In</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
