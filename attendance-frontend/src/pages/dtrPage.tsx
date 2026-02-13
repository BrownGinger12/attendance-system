import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Download,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import employeeService, {
  AttendanceRecord,
  EmployeeDetail,
} from "../services/employeeService";

interface GroupedAttendance {
  date: string;
  amCheckIn?: string;
  amCheckOut?: string;
  pmCheckIn?: string;
  pmCheckOut?: string;
}

const DTRPage: React.FC = () => {
  const [badgeNumber, setBadgeNumber] = useState("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );
  const [attendanceData, setAttendanceData] = useState<GroupedAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEmployee) {
      fetchAttendance();
    }
  }, [selectedEmployee, selectedMonth]);

  const handleBadgeSearch = async () => {
    if (!badgeNumber.trim()) {
      setError("Please enter a badge number");
      return;
    }

    setSearching(true);
    setError(null);
    setSelectedEmployee(null);
    setAttendanceData([]);

    try {
      const response = await employeeService.getEmployeeByBadge(
        badgeNumber.trim(),
      );

      if (response.statusCode === 200 && response.data) {
        setSelectedEmployee(response.data);
        setError(null);
      } else {
        setError("Employee does not exist");
      }
    } catch (err: any) {
      console.error("Error fetching employee:", err);
      if (err.response?.status === 404) {
        setError("Employee does not exist");
      } else {
        setError("Failed to fetch employee. Please try again.");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBadgeSearch();
    }
  };

  const fetchAttendance = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const response = await employeeService.getEmployeeAttendance(
        selectedEmployee.userid,
        selectedMonth,
      );

      const grouped = groupAttendanceByDate(response.data || []);
      setAttendanceData(grouped);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const groupAttendanceByDate = (
    records: AttendanceRecord[],
  ): GroupedAttendance[] => {
    const grouped: { [key: string]: GroupedAttendance } = {};

    records.forEach((record) => {
      const timeMatch = record.checktime.match(/\d{2}:\d{2}:\d{2}/);
      const dateMatch = record.checktime.match(/\d{2} \w{3} \d{4}/);

      if (!timeMatch || !dateMatch) return;

      const time = timeMatch[0];
      const hour = parseInt(time.split(":")[0]);
      const minute = parseInt(time.split(":")[1]);
      const date = new Date(record.checktime).toISOString().split("T")[0];

      if (!grouped[date]) {
        grouped[date] = { date };
      }

      // AM period: before 12:30 PM (up to 12:29 PM)
      // PM period: 12:30 PM and after
      const isAM = hour < 12 || (hour === 12 && minute < 30);

      // Determine if this check-in should be reclassified as check-out
      let effectiveCheckType = record.checktype;

      if (record.checktype === "I") {
        // Reclassify AM check-ins at 11:00 AM or later as check-outs
        if (isAM && hour >= 11) {
          effectiveCheckType = "O";
        }
        // Reclassify PM check-ins at 4:00 PM or later as check-outs
        else if (!isAM && hour >= 16) {
          effectiveCheckType = "O";
        }
      }

      if (effectiveCheckType === "I") {
        // Check-in: keep earliest time
        if (isAM) {
          if (!grouped[date].amCheckIn || time < grouped[date].amCheckIn!) {
            grouped[date].amCheckIn = time;
          }
        } else {
          if (!grouped[date].pmCheckIn || time < grouped[date].pmCheckIn!) {
            grouped[date].pmCheckIn = time;
          }
        }
      } else if (effectiveCheckType === "O") {
        // Check-out: keep latest time that is after check-in
        if (isAM) {
          // Only consider AM out if it's after AM in (or if no AM in yet)
          if (!grouped[date].amCheckIn || time > grouped[date].amCheckIn) {
            if (!grouped[date].amCheckOut || time > grouped[date].amCheckOut!) {
              grouped[date].amCheckOut = time;
            }
          }
        } else {
          // Only consider PM out if it's after PM in (or if no PM in yet)
          if (!grouped[date].pmCheckIn || time > grouped[date].pmCheckIn) {
            if (!grouped[date].pmCheckOut || time > grouped[date].pmCheckOut!) {
              grouped[date].pmCheckOut = time;
            }
          }
        }
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleExportDTR = async () => {
    if (!selectedEmployee) return;

    setExporting(true);
    try {
      const attendanceResponse = await employeeService.getEmployeeAttendance(
        selectedEmployee.userid,
        selectedMonth,
      );

      if (!attendanceResponse.data || attendanceResponse.data.length === 0) {
        alert("No attendance data found for this month");
        setExporting(false);
        return;
      }

      const payload = {
        name: selectedEmployee.name,
        data: attendanceResponse.data,
      };

      // Call the export DTR API through the service
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/fill-dtr-json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export DTR");
      }

      // Get the blob (DOCX file)
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTR_${selectedEmployee.name}_${selectedMonth}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting DTR:", err);
      alert("Failed to export DTR. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const previousMonth = () => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">
            Daily Time Record
          </h1>
          <p className="text-blue-700 text-sm md:text-base">
            Enter badge number to view employee attendance records
          </p>
        </div>

        {/* Badge Number Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6 border-2 border-blue-100">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
              <input
                type="text"
                placeholder="Enter employee badge number..."
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-4 py-3 md:py-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-900 placeholder-blue-400 focus:outline-none focus:border-yellow-400 transition-colors text-base md:text-lg"
              />
            </div>
            <button
              onClick={handleBadgeSearch}
              disabled={searching || !badgeNumber.trim()}
              className="px-6 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Selected Employee & Controls */}
        {selectedEmployee && (
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6 border-2 border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-blue-900">
                    {selectedEmployee.name}
                  </h2>
                  <p className="text-blue-600">
                    Employee ID: {selectedEmployee.badgenumber}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Month Picker */}
                <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-2 border-2 border-blue-200">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-blue-700" />
                  </button>
                  <div className="flex items-center gap-2 px-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-blue-900 font-semibold focus:outline-none cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-blue-700" />
                  </button>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExportDTR}
                  disabled={exporting || attendanceData.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-blue-900 font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Export DTR
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        {selectedEmployee && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-blue-100">
            <div className="p-4 md:p-6 bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Attendance Record
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50 border-b-2 border-blue-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs md:text-sm font-bold text-blue-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-4 text-center text-xs md:text-sm font-bold text-blue-900 uppercase tracking-wider">
                      AM In
                    </th>
                    <th className="px-4 py-4 text-center text-xs md:text-sm font-bold text-blue-900 uppercase tracking-wider">
                      AM Out
                    </th>
                    <th className="px-4 py-4 text-center text-xs md:text-sm font-bold text-blue-900 uppercase tracking-wider">
                      PM In
                    </th>
                    <th className="px-4 py-4 text-center text-xs md:text-sm font-bold text-blue-900 uppercase tracking-wider">
                      PM Out
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Clock className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                        <p className="text-blue-600">
                          Loading attendance data...
                        </p>
                      </td>
                    </tr>
                  ) : attendanceData.length > 0 ? (
                    attendanceData.map((record, index) => (
                      <tr
                        key={index}
                        className="hover:bg-yellow-50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm md:text-base text-blue-900 font-semibold">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm md:text-base">
                          <span
                            className={
                              record.amCheckIn
                                ? "text-blue-700 font-medium"
                                : "text-blue-300"
                            }
                          >
                            {record.amCheckIn || "--:--:--"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm md:text-base">
                          <span
                            className={
                              record.amCheckOut
                                ? "text-blue-700 font-medium"
                                : "text-blue-300"
                            }
                          >
                            {record.amCheckOut || "--:--:--"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm md:text-base">
                          <span
                            className={
                              record.pmCheckIn
                                ? "text-blue-700 font-medium"
                                : "text-blue-300"
                            }
                          >
                            {record.pmCheckIn || "--:--:--"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm md:text-base">
                          <span
                            className={
                              record.pmCheckOut
                                ? "text-blue-700 font-medium"
                                : "text-blue-300"
                            }
                          >
                            {record.pmCheckOut || "--:--:--"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-blue-600"
                      >
                        No attendance records found for this month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {attendanceData.length > 0 && (
              <div className="p-4 bg-blue-50 border-t-2 border-blue-200">
                <p className="text-sm md:text-base text-blue-700">
                  Total records:{" "}
                  <span className="font-bold text-blue-900">
                    {attendanceData.length}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedEmployee && !error && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-blue-100">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-2">
              Search for an Employee
            </h3>
            <p className="text-blue-600">
              Enter an employee badge number in the search box above to view
              their DTR
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DTRPage;
