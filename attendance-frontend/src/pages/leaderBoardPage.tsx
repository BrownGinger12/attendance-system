// pages/LeaderboardPage.tsx
import React, { useState, useEffect } from "react";
import {
  Trophy,
  Award,
  Clock,
  Calendar,
  Briefcase,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import employeeService, { EmployeeSummary } from "../services/employeeService";
import EmployeeModal from "../components/employeeModal";

const LeaderboardPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Helper to safely convert to number and format
  const safeToFixed = (value: any, decimals: number = 2): string => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    return num.toFixed(decimals);
  };

  const fetchLeaderboard = async (month: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployeeSummary(month);

      // Convert string numbers to actual numbers
      const processedData = response.data.map((emp) => ({
        ...emp,
        rank: Number(emp.rank) || 0,
        total_days_worked: Number(emp.total_days_worked) || 0,
        total_am_seconds: Number(emp.total_am_seconds) || 0,
        total_pm_seconds: Number(emp.total_pm_seconds) || 0,
        total_work_seconds: Number(emp.total_work_seconds) || 0,
        avg_am_seconds_per_day: Number(emp.avg_am_seconds_per_day) || 0,
        avg_pm_seconds_per_day: Number(emp.avg_pm_seconds_per_day) || 0,
        avg_work_seconds_per_day: Number(emp.avg_work_seconds_per_day) || 0,
        total_hours: Number(emp.total_hours) || 0,
        avg_hours_per_day: Number(emp.avg_hours_per_day) || 0,
      }));

      setEmployees(processedData);
      setFilteredEmployees(processedData);
    } catch (err) {
      setError("Failed to load leaderboard. Please try again.");
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(selectedMonth);
  }, [selectedMonth]);

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = employees.filter(
        (emp) =>
          emp.employee_name.toLowerCase().includes(query) ||
          emp.badge_number.toLowerCase().includes(query) ||
          (emp.department_name &&
            emp.department_name.toLowerCase().includes(query)),
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr || timeStr === "null") return "N/A";
    const str = String(timeStr);
    return str.substring(0, 5); // HH:MM
  };

  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  // Get employee photo URL
  const getEmployeePhotoUrl = (userId: number) => {
    return `${import.meta.env.VITE_API_BASE_URL}/employee/${userId}/photo`;
  };

  // Handle employee click
  const handleEmployeeClick = (userId: number) => {
    setSelectedUserId(userId);
    setShowModal(true);
  };

  // Handle modal update callback
  const handleEmployeeUpdate = () => {
    fetchLeaderboard(selectedMonth);
  };

  // Get top 3 from filtered results
  const topThree = filteredEmployees.slice(0, 3);
  const restOfEmployees = filteredEmployees.slice(3);

  // Rearrange top 3 to show: 2nd, 1st, 3rd
  const podium =
    topThree.length >= 3
      ? [topThree[1], topThree[0], topThree[2]]
      : topThree.length === 2
        ? [topThree[1], topThree[0]]
        : topThree;

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-auto">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.5s ease-out; }
        .float-animation { animation: float 3s ease-in-out infinite; }
        .gold-glow {
          box-shadow: 0 0 30px rgba(234, 179, 8, 0.4);
        }
        .silver-glow {
          box-shadow: 0 0 20px rgba(148, 163, 184, 0.3);
        }
        .bronze-glow {
          box-shadow: 0 0 20px rgba(217, 119, 6, 0.3);
        }
      `}</style>

      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Employee's Statistics
            </h1>
            <p className="text-slate-400 text-sm">
              Top performers ranked by average hours worked
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-white font-medium min-w-[140px] text-center">
                {formatMonthYear(selectedMonth)}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, badge number, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors"
            />
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-slate-400">
              Showing top 3 results for "{searchQuery}" (
              {filteredEmployees.length} found)
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Top 3 Podium - Shows top 3 from filtered results */}
            {topThree.length > 0 && (
              <div className="mb-12 mt-12 animate-slideUp">
                <div className="flex items-end justify-center gap-6 mb-8">
                  {podium.map((employee, idx) => {
                    const actualRank = employee.rank;
                    const isFirst = actualRank === 1;
                    const isSecond = actualRank === 2;
                    const isThird = actualRank === 3;

                    return (
                      <div
                        key={employee.USERID}
                        className={`relative flex flex-col items-center cursor-pointer ${
                          isFirst
                            ? "order-2 float-animation"
                            : isSecond
                              ? "order-1"
                              : "order-3"
                        }`}
                        style={{
                          animationDelay: `${idx * 0.2}s`,
                        }}
                        onClick={() => handleEmployeeClick(employee.USERID)}
                      >
                        {/* Rank Badge */}
                        <div
                          className={`absolute -top-4 z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            isFirst
                              ? "bg-yellow-500 text-slate-900"
                              : isSecond
                                ? "bg-slate-400 text-slate-900"
                                : "bg-amber-600 text-white"
                          }`}
                        >
                          {actualRank}
                          {isFirst && "st"}
                          {isSecond && "nd"}
                          {isThird && "rd"}
                        </div>

                        {/* Card */}
                        <div
                          className={`relative overflow-hidden rounded-2xl border-2 transition-all hover:scale-105 ${
                            isFirst
                              ? "w-64 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-yellow-500 gold-glow scale-110"
                              : isSecond
                                ? "w-56 bg-gradient-to-br from-slate-400/20 to-slate-500/20 border-slate-400 silver-glow"
                                : "w-56 bg-gradient-to-br from-amber-600/20 to-orange-700/20 border-amber-600 bronze-glow"
                          }`}
                        >
                          {/* Background Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]" />
                          </div>

                          {/* Content */}
                          <div className="relative p-6">
                            {/* Employee Photo */}
                            <div className="mb-4 flex justify-center">
                              <div
                                className={`relative ${
                                  isFirst ? "w-24 h-24" : "w-20 h-20"
                                } rounded-full overflow-hidden border-4 ${
                                  isFirst
                                    ? "border-yellow-500"
                                    : isSecond
                                      ? "border-slate-400"
                                      : "border-amber-600"
                                }`}
                              >
                                <img
                                  src={getEmployeePhotoUrl(employee.USERID)}
                                  alt={employee.employee_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.employee_name)}&background=334155&color=fff&size=200`;
                                  }}
                                />
                                {isFirst && (
                                  <div className="absolute inset-0 bg-yellow-500/20" />
                                )}
                              </div>
                            </div>

                            {/* Employee Info */}
                            <div className="text-center mb-4">
                              <h3
                                className={`font-bold mb-1 ${
                                  isFirst
                                    ? "text-xl text-yellow-500"
                                    : "text-lg text-white"
                                }`}
                              >
                                {employee.employee_name}
                              </h3>
                              <p className="text-xs text-slate-400 mb-1">
                                {employee.department_name || "No Department"}
                              </p>
                              <p className="text-xs text-slate-500">
                                ID: {employee.badge_number}
                              </p>
                            </div>

                            {/* Stats */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                  Avg Hours/Day
                                </span>
                                <span className="font-bold text-white">
                                  {safeToFixed(employee.avg_hours_per_day)}h
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                  Total Hours
                                </span>
                                <span className="font-semibold text-slate-300">
                                  {safeToFixed(employee.total_hours)}h
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Days</span>
                                <span className="font-semibold text-slate-300">
                                  {employee.total_days_worked}
                                </span>
                              </div>
                            </div>

                            {/* Time In/Out */}
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-slate-500 mb-1">AM In</p>
                                  <p className="text-slate-300 font-medium">
                                    {formatTime(employee.avg_am_time_in)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500 mb-1">AM Out</p>
                                  <p className="text-slate-300 font-medium">
                                    {formatTime(employee.avg_am_time_out)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500 mb-1">PM In</p>
                                  <p className="text-slate-300 font-medium">
                                    {formatTime(employee.avg_pm_time_in)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500 mb-1">PM Out</p>
                                  <p className="text-slate-300 font-medium">
                                    {formatTime(employee.avg_pm_time_out)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rankings Table - Always visible, shows filtered results 4+ */}
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-slate-400" />
                Top Trackers
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {restOfEmployees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-800/50">
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Avg Hours/Day
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Performance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {restOfEmployees.map((employee) => (
                          <tr
                            key={employee.USERID}
                            className="hover:bg-slate-800/30 transition-colors"
                          >
                            {/* Rank */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-medium">
                                  #{employee.rank}
                                </span>
                              </div>
                            </td>

                            {/* User */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700">
                                  <img
                                    src={getEmployeePhotoUrl(employee.USERID)}
                                    alt={employee.employee_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.employee_name)}&background=334155&color=fff&size=100`;
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {employee.employee_name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    #{employee.badge_number}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-300">
                                  {employee.department_name || "No Department"}
                                </span>
                              </div>
                            </td>

                            {/* Avg Hours */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-semibold text-white">
                                  {safeToFixed(employee.avg_hours_per_day)}h
                                </span>
                              </div>
                            </td>

                            {/* Total Hours */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm text-slate-300">
                                {safeToFixed(employee.total_hours)}h
                              </span>
                            </td>

                            {/* Performance - View Details Button */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() =>
                                  handleEmployeeClick(employee.USERID)
                                }
                                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-slate-500">
                      {searchQuery
                        ? `No additional employees found beyond top 3 for "${searchQuery}"`
                        : "No additional employees in the rankings"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* No Data at All */}
            {filteredEmployees.length === 0 && !loading && (
              <div className="text-center py-20">
                <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {searchQuery
                    ? `No employees found matching "${searchQuery}"`
                    : `No employee data available for ${formatMonthYear(selectedMonth)}`}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Employee Modal */}
      {selectedUserId && (
        <EmployeeModal
          userId={selectedUserId}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onUpdate={handleEmployeeUpdate}
        />
      )}
    </div>
  );
};

export default LeaderboardPage;
