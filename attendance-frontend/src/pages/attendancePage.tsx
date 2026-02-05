import React, { useState, useEffect } from "react";
import { Calendar, Loader2, Search } from "lucide-react";
import employeeService, { AttendanceRecord } from "../services/employeeService";

type ViewMode = "daily" | "monthly";

interface AttendanceWithName extends AttendanceRecord {
  employeeName?: string;
}

interface GroupedAttendance {
  userId: number;
  employeeName: string;
  date: string;
  amCheckIn?: string;
  amCheckOut?: string;
  pmCheckIn?: string;
  pmCheckOut?: string;
}

const AttendanceRecordPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<GroupedAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeCache, setEmployeeCache] = useState<{ [key: number]: string }>(
    {},
  );

  // Fetch employee name by ID
  const fetchEmployeeName = async (userId: number): Promise<string> => {
    if (employeeCache[userId]) {
      return employeeCache[userId];
    }

    try {
      const response = await employeeService.getEmployeeById(userId);
      const name = response.data.name;
      setEmployeeCache((prev) => ({ ...prev, [userId]: name }));
      return name;
    } catch (err) {
      console.error(`Error fetching employee ${userId}:`, err);
      return "Unknown";
    }
  };

  // Helper function to check if AM Out time is valid (9:00 AM or later)
  const isValidAmOut = (time: string): boolean => {
    const hour = parseInt(time.split(":")[0]);
    return hour >= 9;
  };

  // Helper function to check if PM Out time is valid (1:00 PM or later)
  const isValidPmOut = (time: string): boolean => {
    const hour = parseInt(time.split(":")[0]);
    return hour >= 13; // 13:00 = 1:00 PM
  };

  // Group attendance records by employee and date
  const groupAttendanceRecords = (
    records: AttendanceWithName[],
  ): GroupedAttendance[] => {
    const grouped: { [key: string]: GroupedAttendance } = {};

    // First, organize records by employee and date
    const recordsByEmployee: { [key: string]: AttendanceWithName[] } = {};

    records.forEach((record) => {
      const timeMatch = record.checktime.match(/\d{2}:\d{2}:\d{2}/);
      if (!timeMatch) return;

      const date = new Date(record.checktime);
      const dateKey = date.toISOString().split("T")[0];
      const key = `${record.userid}-${dateKey}`;

      if (!recordsByEmployee[key]) {
        recordsByEmployee[key] = [];
      }
      recordsByEmployee[key].push(record);
    });

    // Process each employee's records for the day
    Object.keys(recordsByEmployee).forEach((key) => {
      const dayRecords = recordsByEmployee[key];
      const [userId, dateKey] = key.split("-");

      if (!grouped[key]) {
        grouped[key] = {
          userId: parseInt(userId),
          employeeName: dayRecords[0].employeeName || "Unknown",
          date: dateKey,
        };
      }

      // Separate AM and PM records
      const amRecords: {
        time: string;
        type: string;
        record: AttendanceWithName;
      }[] = [];
      const pmRecords: {
        time: string;
        type: string;
        record: AttendanceWithName;
      }[] = [];

      dayRecords.forEach((record) => {
        const timeMatch = record.checktime.match(/\d{2}:\d{2}:\d{2}/);
        if (!timeMatch) return;

        const time = timeMatch[0];
        const hour = parseInt(time.split(":")[0]);
        const minute = parseInt(time.split(":")[1]);

        // Determine if AM (before 12:30 PM) or PM (12:30 PM and after)
        const isPM = hour > 12 || (hour === 12 && minute >= 30);

        if (isPM) {
          pmRecords.push({ time, type: record.checktype, record });
        } else {
          amRecords.push({ time, type: record.checktype, record });
        }
      });

      // Sort records by time
      amRecords.sort((a, b) => a.time.localeCompare(b.time));
      pmRecords.sort((a, b) => a.time.localeCompare(b.time));

      // Process AM records
      const amCheckIns = amRecords.filter((r) => r.type === "I");
      const amCheckOuts = amRecords.filter((r) => r.type === "O");

      if (amCheckIns.length > 0) {
        // Get earliest AM check-in
        grouped[key].amCheckIn = amCheckIns[0].time;
      }

      if (amCheckOuts.length > 0) {
        // Find the latest valid AM check-out (9:00 AM or later)
        const validAmOuts = amCheckOuts.filter((r) => isValidAmOut(r.time));
        if (validAmOuts.length > 0) {
          grouped[key].amCheckOut = validAmOuts[validAmOuts.length - 1].time;
        }
      }

      // Process PM records
      const pmCheckIns = pmRecords.filter((r) => r.type === "I");
      const pmCheckOuts = pmRecords.filter((r) => r.type === "O");

      if (pmCheckIns.length > 0) {
        // Get earliest PM check-in
        grouped[key].pmCheckIn = pmCheckIns[0].time;
      }

      if (pmCheckOuts.length > 0) {
        // Find the latest valid PM check-out (1:00 PM or later)
        const validPmOuts = pmCheckOuts.filter((r) => isValidPmOut(r.time));
        if (validPmOuts.length > 0) {
          grouped[key].pmCheckOut = validPmOuts[validPmOuts.length - 1].time;
        }
      }
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return a.employeeName.localeCompare(b.employeeName);
    });
  };

  // Fetch attendance records
  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (viewMode === "daily") {
        response = await employeeService.getAttendanceByDay(selectedDate);
      } else {
        response = await employeeService.getAttendanceByMonth(selectedMonth);
      }

      const records = response.data;

      if (!records || records.length === 0) {
        setAttendance([]);
        setLoading(false);
        return;
      }

      const recordsWithNames = await Promise.all(
        records.map(async (record) => ({
          ...record,
          employeeName: await fetchEmployeeName(record.userid),
        })),
      );

      const groupedRecords = groupAttendanceRecords(recordsWithNames);
      setAttendance(groupedRecords);
    } catch (err: any) {
      console.log("No attendance records found:", err);
      setAttendance([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [viewMode, selectedDate, selectedMonth]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredAttendance = attendance.filter((record) =>
    record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full h-full bg-slate-950 p-6">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Attendance Records
          </h1>
          <p className="text-slate-400 text-sm">
            View employee attendance history
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("daily")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "daily"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "monthly"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            {viewMode === "daily" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-slate-700 transition-colors"
              />
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-slate-700 transition-colors"
              />
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    AM In
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    AM Out
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    PM In
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    PM Out
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredAttendance.length > 0 ? (
                  filteredAttendance.map((record, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {record.employeeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {record.amCheckIn ? (
                          <span className="text-green-400">
                            {record.amCheckIn}
                          </span>
                        ) : (
                          <span className="text-slate-600">--:--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {record.amCheckOut ? (
                          <span className="text-blue-400">
                            {record.amCheckOut}
                          </span>
                        ) : (
                          <span className="text-slate-600">--:--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {record.pmCheckIn ? (
                          <span className="text-green-400">
                            {record.pmCheckIn}
                          </span>
                        ) : (
                          <span className="text-slate-600">--:--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {record.pmCheckOut ? (
                          <span className="text-blue-400">
                            {record.pmCheckOut}
                          </span>
                        ) : (
                          <span className="text-slate-600">--:--:--</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      {searchQuery
                        ? "No employees found matching your search"
                        : "No attendance records available for this period"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredAttendance.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {filteredAttendance.length} of {attendance.length}{" "}
                records
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceRecordPage;
