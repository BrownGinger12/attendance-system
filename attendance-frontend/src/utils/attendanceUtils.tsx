export interface AttendanceLog {
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

export interface EmployeeAttendance {
  USERID: number;
  employeeName: string;
  amCheckIn?: AttendanceLog;
  amCheckOut?: AttendanceLog;
  pmCheckIn?: AttendanceLog;
  pmCheckOut?: AttendanceLog;
  isLate: boolean;
}

export const isLateCheckIn = (checkTime: string): boolean => {
  const date = new Date(checkTime);
  const hour = date.getHours();
  const minute = date.getMinutes();

  // Late if after 8:10 AM (for morning shift)
  if (hour < 12) {
    return (hour === 8 && minute > 10) || hour > 8;
  }

  // Late if after 1:10 PM (for afternoon shift)
  return (hour === 13 && minute > 10) || hour > 13;
};

export const formatTimeAMPM = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const processAttendanceLogs = (
  allLogs: AttendanceLog[],
): Map<number, EmployeeAttendance> => {
  const attendanceMap = new Map<number, EmployeeAttendance>();

  // Get today's logs only
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = allLogs.filter((log) => {
    const logDate = new Date(log.CHECKTIME);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });

  todayLogs.forEach((log) => {
    const userId = log.USERID;
    const logDate = new Date(log.CHECKTIME);
    const hour = logDate.getHours();
    const isAM = hour < 12;

    if (!attendanceMap.has(userId)) {
      attendanceMap.set(userId, {
        USERID: userId,
        employeeName: log.employeeName || "Unknown",
        isLate: false,
      });
    }

    const employee = attendanceMap.get(userId)!;

    if (log.CHECKTYPE === "I") {
      // Check In
      if (isAM) {
        // AM Check In - keep earliest
        if (
          !employee.amCheckIn ||
          new Date(log.CHECKTIME) < new Date(employee.amCheckIn.CHECKTIME)
        ) {
          employee.amCheckIn = log;
          // Check if late for AM shift
          if (isLateCheckIn(log.CHECKTIME)) {
            employee.isLate = true;
          }
        }
      } else {
        // PM Check In - keep earliest
        if (
          !employee.pmCheckIn ||
          new Date(log.CHECKTIME) < new Date(employee.pmCheckIn.CHECKTIME)
        ) {
          employee.pmCheckIn = log;
          // Check if late for PM shift
          if (isLateCheckIn(log.CHECKTIME)) {
            employee.isLate = true;
          }
        }
      }
    } else if (log.CHECKTYPE === "O") {
      // Check Out
      if (isAM) {
        // AM Check Out - keep latest
        if (
          !employee.amCheckOut ||
          new Date(log.CHECKTIME) > new Date(employee.amCheckOut.CHECKTIME)
        ) {
          employee.amCheckOut = log;
        }
      } else {
        // PM Check Out - keep latest
        if (
          !employee.pmCheckOut ||
          new Date(log.CHECKTIME) > new Date(employee.pmCheckOut.CHECKTIME)
        ) {
          employee.pmCheckOut = log;
        }
      }
    }
  });

  return attendanceMap;
};

export const calculateStatistics = (
  attendanceMap: Map<number, EmployeeAttendance>,
) => {
  let late = 0;
  let onTime = 0;

  attendanceMap.forEach((emp) => {
    if (emp.amCheckIn || emp.pmCheckIn) {
      if (emp.isLate) {
        late++;
      } else {
        onTime++;
      }
    }
  });

  return { late, onTime };
};
