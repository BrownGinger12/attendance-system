import React from "react";
import {
  Users,
  FileText,
  ChevronRight,
  GaugeCircle,
  Gauge,
  UserStar,
} from "lucide-react";

interface SidebarProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  activePage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isExpanded = true,
  onToggle,
  activePage,
  onPageChange,
}) => {
  const menuItems = [
    { id: "dashboard", icon: GaugeCircle, label: "Dashboard" },
    { id: "employee", icon: Users, label: "Employee" },
    { id: "employeeStat", icon: UserStar, label: "Employee Statistics" },
    { id: "attendance", icon: FileText, label: "Attendance Record" },
    { id: "realtimeAttendance", icon: Gauge, label: "Real-time Attendance" },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 h-screen transition-all duration-300 ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      <div className="flex flex-col h-full py-4">
        {/* Menu Items */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                activePage === item.id
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isExpanded && (
                <span className="text-sm font-medium truncate">
                  {item.label}
                </span>
              )}
              {isExpanded && activePage === item.id && (
                <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
