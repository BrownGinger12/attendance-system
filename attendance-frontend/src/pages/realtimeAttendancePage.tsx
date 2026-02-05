import React, { useState, useEffect } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  User,
  Clock,
  UserCheck,
  UserX,
  Search,
  Filter,
} from "lucide-react";
import { io } from "socket.io-client";
import employeeService from "../services/employeeService";
import {
  AttendanceLog,
  EmployeeAttendance,
  processAttendanceLogs,
  calculateStatistics,
  formatTimeAMPM,
  formatDate,
} from "../utils/attendanceUtils";

const ATTENDANCE_NS = "/attendance";

const RealtimeAttendancePage: React.FC = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<
    Map<number, EmployeeAttendance>
  >(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Disconnected");
  const [employeeCache, setEmployeeCache] = useState<{ [key: number]: string }>(
    {},
  );
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [lateCount, setLateCount] = useState<number>(0);
  const [onTimeCount, setOnTimeCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "late" | "ontime">(
    "all",
  );

  useEffect(() => {
    const fetchTotalEmployees = async () => {
      try {
        const total = await employeeService.getTotalEmployeeCount();
        setTotalEmployees(total);
      } catch (err) {
        console.error("Error fetching total employees:", err);
      }
    };

    fetchTotalEmployees();

    const socket = io("http://10.10.10.2:5000/attendance", {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("connect", () => {
      console.log("Connected to attendance namespace");
      setIsConnected(true);
      setStatusMessage("Connected to attendance namespace");
    });

    socket.on("status", (data) => {
      console.log("Status:", data.message);
      setStatusMessage(data.message);
    });

    socket.on("attendance:init", async (data) => {
      console.log("Initial attendance data:", data);
      const logsWithNames = await Promise.all(
        data.map(async (log: AttendanceLog) => ({
          ...log,
          employeeName: await fetchEmployeeName(log.userid),
        })),
      );
      setLogs(logsWithNames);
      updateAttendanceData(logsWithNames);
    });

    socket.on("new_attendance", async (record) => {
      console.log("New record:", record);
      const recordWithName = {
        ...record,
        employeeName: await fetchEmployeeName(record.userid),
      };

      setLogs((prev) => {
        const updated = [recordWithName, ...prev];
        updateAttendanceData(updated);
        return updated;
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from attendance namespace");
      setIsConnected(false);
      setStatusMessage("Disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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

  const updateAttendanceData = (allLogs: AttendanceLog[]) => {
    const attendanceMap = processAttendanceLogs(allLogs);
    setEmployeeAttendance(attendanceMap);

    const { late, onTime } = calculateStatistics(attendanceMap);
    setLateCount(late);
    setOnTimeCount(onTime);
  };

  const notClockedIn = totalEmployees - (onTimeCount + lateCount);
  const attendanceArray = Array.from(employeeAttendance.values());

  const filteredAttendance = attendanceArray.filter((employee) => {
    const matchesSearch =
      employee.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.userid.toString().includes(searchQuery);

    let matchesFilter = true;
    if (filterStatus === "late") {
      matchesFilter = employee.isLate;
    } else if (filterStatus === "ontime") {
      matchesFilter =
        !employee.isLate &&
        (employee.amCheckIn !== undefined || employee.pmCheckIn !== undefined);
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full h-full bg-slate-950 p-6">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Real-time Attendance
            </h1>
            <p className="text-slate-400 text-sm">Live attendance monitoring</p>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400 font-medium">
                  Connected
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400 font-medium">
                  Disconnected
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Late Employees
                </p>
                <p className="text-white text-2xl font-semibold">{lateCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  On Time
                </p>
                <p className="text-white text-2xl font-semibold">
                  {onTimeCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-900/30 rounded-lg">
                <UserX className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Not Clocked In
                </p>
                <p className="text-white text-2xl font-semibold">
                  {notClockedIn}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Today's Attendance
              </h2>
              <span className="text-slate-400 text-sm">
                {filteredAttendance.length} of {attendanceArray.length}{" "}
                employees
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as "all" | "late" | "ontime")
                  }
                  className="pl-10 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="all">All Employees</option>
                  <option value="late">Late Only</option>
                  <option value="ontime">On Time Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    AM In
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    AM Out
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    PM In
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                    PM Out
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      {attendanceArray.length === 0 ? (
                        <div>
                          <Activity className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                          <p>No attendance records available for this period</p>
                        </div>
                      ) : (
                        <div>
                          <p>No employees found</p>
                          <p className="text-sm mt-2">
                            Try adjusting your search or filter
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((employee) => {
                    const amIn = employee.amCheckIn
                      ? formatTimeAMPM(employee.amCheckIn.checktime)
                      : "-";
                    const amOut = employee.amCheckOut
                      ? formatTimeAMPM(employee.amCheckOut.checktime)
                      : "-";
                    const pmIn = employee.pmCheckIn
                      ? formatTimeAMPM(employee.pmCheckIn.checktime)
                      : "-";
                    const pmOut = employee.pmCheckOut
                      ? formatTimeAMPM(employee.pmCheckOut.checktime)
                      : "-";
                    const date =
                      employee.amCheckIn || employee.pmCheckIn
                        ? formatDate(
                            (employee.amCheckIn || employee.pmCheckIn)!
                              .checktime,
                          )
                        : "-";

                    return (
                      <tr
                        key={employee.userid}
                        className="hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white">
                                  {employee.employeeName}
                                </p>
                                {employee.isLate && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-800">
                                    Late
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                ID: {employee.userid}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-300">
                          {amIn}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-300">
                          {amOut}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-300">
                          {pmIn}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-300">
                          {pmOut}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RealtimeAttendancePage;
