import React, { useState, useEffect } from "react";
import { Activity, Wifi, WifiOff, User } from "lucide-react";
import { io, Socket } from "socket.io-client";
import employeeService from "../services/employeeService";

interface AttendanceLog {
  USERID: number;
  CHECKTIME: string;
  CHECKTYPE: string;
  VERIFYCODE?: number;
  SENSORID?: string;
  Memoinfo?: string;
  WorkCode?: string | null;
  sn?: string | null;
  UserExtFmt?: number | null;
  employeeName?: string;
}

const ATTENDANCE_NS = "/attendance";

const RealtimeAttendancePage: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Disconnected");
  const [employeeCache, setEmployeeCache] = useState<{ [key: number]: string }>(
    {},
  );
  const maxLogs = 50; // Keep last 50 logs

  useEffect(() => {
    // Connect to SocketIO backend with namespace
    const newSocket = io("http://127.0.0.1:5000" + ATTENDANCE_NS, {
      transports: ["websocket"],
      path: "/socket.io",
      autoConnect: true,
      forceNew: true,
      withCredentials: false,
    });

    setSocket(newSocket);

    // Handle connection
    newSocket.on("connect", () => {
      console.log("Connected to attendance namespace");
      setIsConnected(true);
      setStatusMessage("Connected to attendance namespace");
    });

    // Handle disconnect
    newSocket.on("disconnect", () => {
      console.log("Disconnected from attendance namespace");
      setIsConnected(false);
      setStatusMessage("Disconnected");
    });

    // Listen for new attendance records
    newSocket.on(
      "attendance:new",
      async (data: AttendanceLog | AttendanceLog[]) => {
        console.log("New attendance:", data);

        // Handle both single log and array of logs
        const newLogs = Array.isArray(data) ? data : [data];

        // Fetch employee names for new logs
        const logsWithNames = await Promise.all(
          newLogs.map(async (log) => ({
            ...log,
            employeeName: await fetchEmployeeName(log.USERID),
          })),
        );

        setLogs((prev) => {
          const updated = [...logsWithNames, ...prev];
          return updated.slice(0, maxLogs);
        });
      },
    );

    // Listen for status messages
    newSocket.on("status", (data: { message: string }) => {
      console.log("Status:", data.message);
      setStatusMessage(data.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchEmployeeName = async (userId: number): Promise<string> => {
    if (employeeCache[userId]) {
      return employeeCache[userId];
    }

    try {
      const response = await employeeService.getEmployeeById(userId);
      const name = response.data.Name;
      setEmployeeCache((prev) => ({ ...prev, [userId]: name }));
      return name;
    } catch (err) {
      console.error(`Error fetching employee ${userId}:`, err);
      return "Unknown";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const checkTime = new Date(dateString);
    const diffMs = now.getTime() - checkTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateString);
  };

  return (
    <div className="w-full h-full bg-slate-950 p-6">
      <div className="max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Real-time Attendance
            </h1>
            <p className="text-slate-400 text-sm">Live attendance monitoring</p>
          </div>

          {/* Connection Status */}
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Total Logs
                </p>
                <p className="text-white text-2xl font-semibold">
                  {logs.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-900/30 rounded-lg">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Check-ins
                </p>
                <p className="text-white text-2xl font-semibold">
                  {logs.filter((l) => l.CHECKTYPE === "I").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-900/30 rounded-lg">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Check-outs
                </p>
                <p className="text-white text-2xl font-semibold">
                  {logs.filter((l) => l.CHECKTYPE === "O").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Live Feed
            </h2>
          </div>

          <div className="overflow-y-auto max-h-[600px]">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p>Waiting for attendance logs...</p>
                <p className="text-sm mt-2">
                  New check-ins and check-outs will appear here in real-time
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="p-4 hover:bg-slate-800/50 transition-colors animate-fadeIn"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium truncate">
                              {log.employeeName || "Loading..."}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                log.CHECKTYPE === "I"
                                  ? "bg-green-900/30 text-green-400 border border-green-800"
                                  : "bg-blue-900/30 text-blue-400 border border-blue-800"
                              }`}
                            >
                              {log.CHECKTYPE === "I" ? "Check In" : "Check Out"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <span className="text-slate-500">ID:</span>
                              {log.USERID}
                            </span>
                            {log.SENSORID && (
                              <span className="flex items-center gap-1">
                                <span className="text-slate-500">Sensor:</span>
                                {log.SENSORID}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-white font-medium text-sm">
                          {formatTime(log.CHECKTIME)}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {getTimeAgo(log.CHECKTIME)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
