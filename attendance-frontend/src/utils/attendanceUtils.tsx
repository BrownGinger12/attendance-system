export interface AttendanceLog {
  userid: number;
  checktime: string;
  checktype: string;
  verifycode?: number;
  sensorid?: string;
  Memoinfo?: string;
  WorkCode?: string | null;
  sn?: string | null;
  UserExtFmt?: number | null;
  employeeName?: string;
}

export interface EmployeeAttendance {
  userid: number;
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
    const logDate = new Date(log.checktime);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });

  // Group logs by user
  const logsByUser: { [key: number]: AttendanceLog[] } = {};
  todayLogs.forEach((log) => {
    if (!logsByUser[log.userid]) {
      logsByUser[log.userid] = [];
    }
    logsByUser[log.userid].push(log);
  });

  // Process each user's logs
  Object.keys(logsByUser).forEach((userIdStr) => {
    const userId = parseInt(userIdStr);
    const userLogs = logsByUser[userId];

    if (!attendanceMap.has(userId)) {
      attendanceMap.set(userId, {
        userid: userId,
        employeeName: userLogs[0].employeeName || "Unknown",
        isLate: false,
      });
    }

    const employee = attendanceMap.get(userId)!;

    // Separate AM and PM logs
    const amLogs: AttendanceLog[] = [];
    const pmLogs: AttendanceLog[] = [];

    userLogs.forEach((log) => {
      const logDate = new Date(log.checktime);
      const hour = logDate.getHours();
      const minutes = logDate.getMinutes();

      // AM period: before 12:30 PM (up to 12:29 PM)
      // PM period: 12:30 PM and after
      const isAM = hour < 12 || (hour === 12 && minutes < 30);

      if (isAM) {
        amLogs.push(log);
      } else {
        pmLogs.push(log);
      }
    });

    // Sort logs by time
    amLogs.sort(
      (a, b) =>
        new Date(a.checktime).getTime() - new Date(b.checktime).getTime(),
    );
    pmLogs.sort(
      (a, b) =>
        new Date(a.checktime).getTime() - new Date(b.checktime).getTime(),
    );

    // Process AM logs
    const amCheckIns = amLogs.filter((log) => log.checktype === "I");
    const amCheckOuts = amLogs.filter((log) => log.checktype === "O");

    if (amCheckIns.length > 0) {
      // Get earliest AM check-in
      employee.amCheckIn = amCheckIns[0];
      // Check if late for AM shift
      if (isLateCheckIn(amCheckIns[0].checktime)) {
        employee.isLate = true;
      }
    }

    if (amCheckOuts.length > 0) {
      // Find the latest valid AM check-out (9:00 AM or later)
      const validAmOuts = amCheckOuts.filter((log) => {
        const logDate = new Date(log.checktime);
        const hour = logDate.getHours();
        return hour >= 9;
      });

      if (validAmOuts.length > 0) {
        employee.amCheckOut = validAmOuts[validAmOuts.length - 1];
      }
    }

    // Process PM logs
    const pmCheckIns = pmLogs.filter((log) => log.checktype === "I");
    const pmCheckOuts = pmLogs.filter((log) => log.checktype === "O");

    if (pmCheckIns.length > 0) {
      // Get earliest PM check-in
      employee.pmCheckIn = pmCheckIns[0];
      // Check if late for PM shift
      if (isLateCheckIn(pmCheckIns[0].checktime)) {
        employee.isLate = true;
      }
    }

    if (pmCheckOuts.length > 0) {
      // Find the latest valid PM check-out (1:00 PM or later)
      const validPmOuts = pmCheckOuts.filter((log) => {
        const logDate = new Date(log.checktime);
        const hour = logDate.getHours();
        return hour >= 13; // 13:00 = 1:00 PM
      });

      if (validPmOuts.length > 0) {
        employee.pmCheckOut = validPmOuts[validPmOuts.length - 1];
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
