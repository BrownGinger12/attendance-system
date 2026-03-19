// pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Trophy,
  Users,
  Clock,
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
  Award,
  ChevronDown,
  Activity,
  BarChart2,
  Zap,
  Calendar,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import employeeService, { EmployeeSummary } from "../services/employeeService";
// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentStat {
  deptname: string;
  total: number;
  onTime: number;
  percentage: number;
}

interface DateRange {
  start: string;
  end: string;
}

interface RecentCheckIn {
  name: string;
  userId: number;
  time: string;
  dept: string;
  isLate: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeToFixed = (value: any, decimals = 2): string => {
  const num = Number(value);
  return isNaN(num) ? "0.00" : num.toFixed(decimals);
};

const getEmployeePhotoUrl = (userId: number) =>
  `${import.meta.env.VITE_API_BASE_URL}/employee/${userId}/photo`;

const avatarFallback = (name: string, size = 100) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=334155&color=fff&size=${size}`;

const todayISO = (): string => new Date().toISOString().split("T")[0];

const monthAgoISO = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
};

const formatDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  delay?: number;
}> = ({ icon, label, value, sub, accent, delay = 0 }) => (
  <div
    className="relative bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden group"
    style={{ animation: `slideUp 0.5s ease-out ${delay}s both` }}
  >
    <div
      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${accent}`}
    />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-2">
          {label}
        </p>
        <p className="text-3xl font-bold text-white leading-none mb-1">
          {value}
        </p>
        {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      </div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
    </div>
  </div>
);

// ─── PodiumCard ───────────────────────────────────────────────────────────────

const PodiumCard: React.FC<{
  employee: EmployeeSummary;
  isFirst: boolean;
  isSecond: boolean;
}> = ({ employee, isFirst, isSecond }) => {
  const border = isFirst
    ? "border-yellow-500"
    : isSecond
      ? "border-slate-400"
      : "border-amber-600";
  const bg = isFirst
    ? "from-yellow-500/20 to-amber-600/20"
    : isSecond
      ? "from-slate-400/20 to-slate-500/20"
      : "from-amber-600/20 to-orange-700/20";
  const nameColor = isFirst ? "text-yellow-400" : "text-white";
  const rankBg = isFirst
    ? "bg-yellow-500 text-slate-900"
    : isSecond
      ? "bg-slate-400 text-slate-900"
      : "bg-amber-600 text-white";
  const glowClass = isFirst
    ? "gold-glow"
    : isSecond
      ? "silver-glow"
      : "bronze-glow";

  return (
    <div
      className={`relative flex flex-col items-center ${isFirst ? "float-animation" : ""}`}
    >
      <div
        className={`absolute -top-4 z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${rankBg}`}
      >
        {employee.rank}
        {isFirst ? "st" : isSecond ? "nd" : "rd"}
      </div>
      <div
        className={`relative overflow-hidden rounded-2xl border-2 transition-all hover:scale-105 cursor-pointer bg-gradient-to-br ${bg} ${border} ${glowClass} ${isFirst ? "w-52 scale-105" : "w-44"}`}
      >
        <div className="relative p-5">
          <div className="mb-3 flex justify-center">
            <div
              className={`${isFirst ? "w-20 h-20" : "w-16 h-16"} rounded-full overflow-hidden border-4 ${border}`}
            >
              <img
                src={getEmployeePhotoUrl(employee.USERID)}
                alt={employee.employee_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = avatarFallback(
                    employee.employee_name,
                    200,
                  );
                }}
              />
            </div>
          </div>
          <div className="text-center mb-3">
            <h3 className={`font-bold text-sm mb-0.5 ${nameColor}`}>
              {employee.employee_name}
            </h3>
            <p className="text-xs text-slate-400">
              {employee.department_name || "—"}
            </p>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Avg/Day</span>
              <span className="font-bold text-white">
                {safeToFixed(employee.avg_hours_per_day)}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total</span>
              <span className="text-slate-300">
                {safeToFixed(employee.total_hours)}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Days</span>
              <span className="text-slate-300">
                {employee.total_days_worked}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DateRangePicker ──────────────────────────────────────────────────────────

const DateRangePicker: React.FC<{
  range: DateRange;
  onChange: (range: DateRange) => void;
}> = ({ range, onChange }) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(range);

  const apply = () => {
    onChange(local);
    setOpen(false);
  };

  const presets = [
    {
      label: "Last 7 days",
      fn: () => {
        const end = todayISO();
        const s = new Date();
        s.setDate(s.getDate() - 6);
        return { start: s.toISOString().split("T")[0], end };
      },
    },
    {
      label: "Last 30 days",
      fn: () => {
        const end = todayISO();
        const s = new Date();
        s.setDate(s.getDate() - 29);
        return { start: s.toISOString().split("T")[0], end };
      },
    },
    {
      label: "This month",
      fn: () => {
        const now = new Date();
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0],
          end: todayISO(),
        };
      },
    },
    {
      label: "Last month",
      fn: () => {
        const now = new Date();
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1)
            .toISOString()
            .split("T")[0],
          end: new Date(now.getFullYear(), now.getMonth(), 0)
            .toISOString()
            .split("T")[0],
        };
      },
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white hover:border-slate-700 transition-colors"
      >
        <Calendar className="w-4 h-4 text-slate-400" />
        <span>
          {formatDisplayDate(range.start)} → {formatDisplayDate(range.end)}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 animate-fadeIn">
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setLocal(p.fn())}
                className="text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1.5 transition-colors text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Start</label>
              <input
                type="date"
                value={local.start}
                max={local.end}
                onChange={(e) => setLocal({ ...local, start: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">End</label>
              <input
                type="date"
                value={local.end}
                min={local.start}
                max={todayISO()}
                onChange={(e) => setLocal({ ...local, end: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="flex-1 text-xs text-white bg-violet-600 hover:bg-violet-500 rounded-lg py-1.5 transition-colors font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── DepartmentChart ──────────────────────────────────────────────────────────

const DepartmentChart: React.FC<{ stats: DepartmentStat[] }> = ({ stats }) => {
  const sorted = [...stats]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);
  const max = sorted[0]?.percentage || 100;

  const colors = [
    { bar: "from-violet-500 to-purple-600", text: "text-violet-400" },
    { bar: "from-blue-500 to-cyan-600", text: "text-blue-400" },
    { bar: "from-emerald-500 to-teal-600", text: "text-emerald-400" },
    { bar: "from-amber-500 to-orange-600", text: "text-amber-400" },
    { bar: "from-pink-500 to-rose-600", text: "text-pink-400" },
    { bar: "from-indigo-500 to-blue-600", text: "text-indigo-400" },
    { bar: "from-teal-500 to-cyan-600", text: "text-teal-400" },
    { bar: "from-orange-500 to-red-600", text: "text-orange-400" },
  ];

  if (sorted.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-8">
        No attendance data for today
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((dept, i) => (
        <div key={dept.deptname}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-300 truncate max-w-[180px]">
              {dept.deptname}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500">
                {dept.onTime}/{dept.total}
              </span>
              <span
                className={`text-sm font-bold ${colors[i % colors.length].text}`}
              >
                {dept.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length].bar} transition-all duration-700`}
              style={{ width: `${(dept.percentage / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── DashboardPage ────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const currentMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [dateRange, setDateRange] = useState<DateRange>({
    start: monthAgoISO(),
    end: todayISO(),
  });

  const [leaderboard, setLeaderboard] = useState<EmployeeSummary[]>([]);
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [onTimeCount, setOnTimeCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);

  // Stable ref so the socket callback always sees the latest name map
  const employeeInfoMapRef = useRef<
    Map<number, { name: string; dept: string }>
  >(new Map());

  // ── Check if a checktime string (RFC 2822 or ISO) is late (after 08:10) ─────
  // Use UTC hours because checktime strings end with "GMT" and are UTC-based
  // AM late = after 08:10 UTC, PM late = after 13:10 UTC
  const isLateAM = (d: Date) =>
    d.getUTCHours() > 8 || (d.getUTCHours() === 8 && d.getUTCMinutes() > 10);
  const isLatePM = (d: Date) =>
    d.getUTCHours() > 13 || (d.getUTCHours() === 13 && d.getUTCMinutes() > 10);
  const isPM = (d: Date) => d.getUTCHours() >= 12;

  const isLateCheck = (checktime: string): boolean => {
    const d = new Date(checktime);
    return isPM(d) ? isLatePM(d) : isLateAM(d);
  };

  // ── Process raw API records directly (bypasses processAttendanceLogs which
  //    expects ISO format — REST API returns RFC 2822 GMT strings) ─────────────
  const applyRawRecords = useCallback(
    (
      rawRecords: any[],
      infoMap: Map<number, { name: string; dept: string }>,
    ) => {
      // Track earliest AM check-in (before 12:00) and earliest PM check-in (12:00+)
      // per employee separately — each session is counted independently
      const amCheckIn = new Map<number, Date>(); // userid → earliest AM Date
      const pmCheckIn = new Map<number, Date>(); // userid → earliest PM Date

      rawRecords.forEach((r) => {
        if (r.checktype !== "I") return;
        const uid = Number(r.userid);
        const d = new Date(r.checktime);

        if (isPM(d)) {
          const existing = pmCheckIn.get(uid);
          if (!existing || d < existing) pmCheckIn.set(uid, d);
        } else {
          const existing = amCheckIn.get(uid);
          if (!existing || d < existing) amCheckIn.set(uid, d);
        }
      });

      let late = 0;
      let onTime = 0;
      const deptAgg = new Map<string, { total: number; onTime: number }>();

      const countSession = (
        uid: number,
        d: Date,
        lateCheck: (d: Date) => boolean,
      ) => {
        const late_ = lateCheck(d);
        if (late_) late++;
        else onTime++;
        const deptName = infoMap.get(uid)?.dept ?? "Unknown";
        if (!deptAgg.has(deptName))
          deptAgg.set(deptName, { total: 0, onTime: 0 });
        const entry = deptAgg.get(deptName)!;
        entry.total += 1;
        if (!late_) entry.onTime += 1;
      };

      // Only count the current session: AM before 12:00 UTC, PM from 12:00 UTC onwards
      const nowUTC = new Date();
      const isCurrentlyPM = nowUTC.getUTCHours() >= 12;

      if (isCurrentlyPM) {
        pmCheckIn.forEach((d, uid) => countSession(uid, d, isLatePM));
      } else {
        amCheckIn.forEach((d, uid) => countSession(uid, d, isLateAM));
      }

      setLateCount(late);
      setOnTimeCount(onTime);

      const computedDeptStats: DepartmentStat[] = [];
      deptAgg.forEach((v, deptname) => {
        computedDeptStats.push({
          deptname,
          total: v.total,
          onTime: v.onTime,
          percentage: v.total > 0 ? (v.onTime / v.total) * 100 : 0,
        });
      });
      setDeptStats(computedDeptStats);
    },
    [],
  );

  // ── Load leaderboard + today's attendance ─────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Leaderboard
      const summaryRes = await employeeService.getEmployeeSummary(currentMonth);
      const processedLeaderboard = summaryRes.data.map(
        (e: EmployeeSummary) => ({
          ...e,
          rank: Number(e.rank) || 0,
          total_hours: Number(e.total_hours) || 0,
          avg_hours_per_day: Number(e.avg_hours_per_day) || 0,
          total_days_worked: Number(e.total_days_worked) || 0,
        }),
      );
      setLeaderboard(processedLeaderboard);

      // 2. Build name/dept lookup
      const infoMap = new Map<number, { name: string; dept: string }>();
      processedLeaderboard.forEach((e: EmployeeSummary) => {
        infoMap.set(e.USERID, {
          name: e.employee_name,
          dept: e.department_name || "—",
        });
      });
      employeeInfoMapRef.current = infoMap;

      // 3. Total employees
      try {
        const total = await employeeService.getTotalEmployeeCount();
        setTotalEmployees(total);
      } catch {
        setTotalEmployees(summaryRes.count);
      }

      // 4. Today's attendance from REST API
      //    Response is already sorted descending (most recent first)
      const todayAttRes = await employeeService.getAttendanceByDay(todayISO());
      const rawRecords: any[] = todayAttRes.data ?? [];

      // 4a. Recent 5 check-ins — take the top 5 records directly from the API
      //     (no need to sort; API guarantees descending order)
      const recent: RecentCheckIn[] = rawRecords.slice(0, 5).map((r) => ({
        name: infoMap.get(Number(r.userid))?.name ?? `User ${r.userid}`,
        userId: Number(r.userid),
        time: r.checktime, // RFC 2822 string
        dept: infoMap.get(Number(r.userid))?.dept ?? "—",
        isLate: isLateCheck(r.checktime),
      }));
      setRecentCheckIns(recent);

      // 4b. Count late/ontime + dept stats directly from raw records
      applyRawRecords(rawRecords, infoMap);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, applyRawRecords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Socket — same source of truth as RealtimeAttendancePage ────────────────
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL;

    const socket: Socket = io(`${API_URL}/attendance`, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
    });

    // attendance:init — re-fetch REST API so checktime stays as raw GMT string
    socket.on("attendance:init", () => {
      const infoMap = employeeInfoMapRef.current;
      employeeService
        .getAttendanceByDay(todayISO())
        .then((res) => {
          const rawRecords: any[] = res.data ?? [];
          const recent: RecentCheckIn[] = rawRecords.slice(0, 5).map((r) => ({
            name: infoMap.get(Number(r.userid))?.name ?? `User ${r.userid}`,
            userId: Number(r.userid),
            time: r.checktime,
            dept: infoMap.get(Number(r.userid))?.dept ?? "—",
            isLate: isLateCheck(r.checktime),
          }));
          setRecentCheckIns(recent);
          applyRawRecords(rawRecords, infoMap);
        })
        .catch(console.error);
    });

    // new_attendance fires for every new tap — re-fetch the REST API so both
    // recent check-ins AND late/ontime counts stay in sync with the same source
    socket.on("new_attendance", () => {
      const infoMapNow = employeeInfoMapRef.current;

      employeeService
        .getAttendanceByDay(todayISO())
        .then((res) => {
          const rawRecords: any[] = res.data ?? [];

          // Recent 5 — top of the descending-sorted API response
          const recent: RecentCheckIn[] = rawRecords.slice(0, 5).map((r) => ({
            name: infoMapNow.get(Number(r.userid))?.name ?? `User ${r.userid}`,
            userId: Number(r.userid),
            time: r.checktime,
            dept: infoMapNow.get(Number(r.userid))?.dept ?? "—",
            isLate: isLateCheck(r.checktime),
          }));
          setRecentCheckIns(recent);

          // Counts + dept stats
          applyRawRecords(rawRecords, infoMapNow);
        })
        .catch(console.error);
    });

    return () => {
      socket.disconnect();
    };
  }, [applyRawRecords]);

  const top3 = leaderboard.slice(0, 3);
  const podium =
    top3.length >= 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [top3[1], top3[0]]
        : top3;

  const attendanceRate =
    onTimeCount + lateCount > 0
      ? ((onTimeCount / (onTimeCount + lateCount)) * 100).toFixed(0)
      : "0";

  const topDept =
    deptStats.length > 0
      ? [...deptStats].sort((a, b) => b.percentage - a.percentage)[0].deptname
      : "—";

  return (
    <div className="w-full h-full bg-slate-950 p-6 overflow-auto">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        .animate-fadeIn  { animation: fadeIn  0.35s ease-out both; }
        .animate-slideUp { animation: slideUp 0.5s  ease-out both; }
        .float-animation { animation: float   3s    ease-in-out infinite; }
        .gold-glow   { box-shadow: 0 0 28px rgba(234,179,8,0.35);  }
        .silver-glow { box-shadow: 0 0 20px rgba(148,163,184,0.25);}
        .bronze-glow { box-shadow: 0 0 20px rgba(217,119,6,0.25);  }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5); cursor: pointer;
        }
      `}</style>

      <div className="max-w-full mx-auto space-y-6">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <DateRangePicker range={dateRange} onChange={setDateRange} />
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Stat Cards ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-5 h-5 text-violet-400" />}
                label="Total Employees"
                value={totalEmployees}
                sub="Registered in system"
                accent="bg-gradient-to-br from-violet-500/5 to-transparent"
                delay={0}
              />
              <StatCard
                icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
                label="On Time Today"
                value={onTimeCount}
                sub={`${attendanceRate}% on-time rate`}
                accent="bg-gradient-to-br from-emerald-500/5 to-transparent"
                delay={0.08}
              />
              <StatCard
                icon={<XCircle className="w-5 h-5 text-rose-400" />}
                label="Late Today"
                value={lateCount}
                sub="Arrived after 8:10 AM"
                accent="bg-gradient-to-br from-rose-500/5 to-transparent"
                delay={0.16}
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
                label="Top Hours/Day"
                value={
                  leaderboard[0]
                    ? `${safeToFixed(leaderboard[0].avg_hours_per_day)}h`
                    : "—"
                }
                sub={leaderboard[0]?.employee_name ?? "No data"}
                accent="bg-gradient-to-br from-amber-500/5 to-transparent"
                delay={0.24}
              />
            </div>

            {/* ── Middle Row ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Top 3 Performers */}
              <div
                className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6"
                style={{ animation: "slideUp 0.5s ease-out 0.2s both" }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-base font-semibold text-white">
                    Top 3 Performers
                  </h2>
                  <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {new Date().toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {top3.length > 0 ? (
                  <div className="flex items-end justify-center gap-6 pt-6">
                    {podium.map((emp) => (
                      <PodiumCard
                        key={emp.USERID}
                        employee={emp}
                        isFirst={emp.rank === 1}
                        isSecond={emp.rank === 2}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-slate-500 text-sm">
                      No leaderboard data available
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Check-ins */}
              <div
                className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6"
                style={{ animation: "slideUp 0.5s ease-out 0.28s both" }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-semibold text-white">
                    Recent Check-ins
                  </h2>
                  <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                </div>

                {recentCheckIns.length > 0 ? (
                  <div className="space-y-3">
                    {recentCheckIns.map((ci, i) => (
                      <div
                        key={`${ci.userId}-${i}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
                        style={{
                          animation: `fadeIn 0.3s ease-out ${i * 0.06}s both`,
                        }}
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 shrink-0">
                          <img
                            src={getEmployeePhotoUrl(ci.userId)}
                            alt={ci.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                avatarFallback(ci.name);
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {ci.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {ci.dept}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-slate-300 mb-0.5">
                            {ci.time.split(" ")[4]}
                          </p>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              ci.isLate
                                ? "bg-rose-900/40 text-rose-400"
                                : "bg-emerald-900/40 text-emerald-400"
                            }`}
                          >
                            {ci.isLate ? "Late" : "On Time"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-slate-500 text-sm">
                      No check-ins recorded today
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom Row ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Department On-Time Chart */}
              <div
                className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6"
                style={{ animation: "slideUp 0.5s ease-out 0.36s both" }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <BarChart2 className="w-5 h-5 text-violet-400" />
                  <h2 className="text-base font-semibold text-white">
                    Department On-Time Rate
                  </h2>
                  <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                </div>
                <DepartmentChart stats={deptStats} />
              </div>

              {/* Rankings Snapshot */}
              <div
                className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6"
                style={{ animation: "slideUp 0.5s ease-out 0.44s both" }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Award className="w-5 h-5 text-slate-400" />
                  <h2 className="text-base font-semibold text-white">
                    Rankings Snapshot
                  </h2>
                </div>

                <div className="space-y-3">
                  {leaderboard.slice(0, 7).map((emp, i) => (
                    <div
                      key={emp.USERID}
                      className="flex items-center gap-3"
                      style={{
                        animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`,
                      }}
                    >
                      <span
                        className={`w-6 text-center text-xs font-bold shrink-0 ${
                          emp.rank === 1
                            ? "text-yellow-400"
                            : emp.rank === 2
                              ? "text-slate-400"
                              : emp.rank === 3
                                ? "text-amber-600"
                                : "text-slate-600"
                        }`}
                      >
                        #{emp.rank}
                      </span>
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 shrink-0">
                        <img
                          src={getEmployeePhotoUrl(emp.USERID)}
                          alt={emp.employee_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = avatarFallback(
                              emp.employee_name,
                              80,
                            );
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {emp.employee_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {emp.department_name || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-semibold text-slate-300">
                          {safeToFixed(emp.avg_hours_per_day)}h
                        </span>
                      </div>
                    </div>
                  ))}

                  {leaderboard.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">
                      No data available
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Summary Bar ───────────────────────────────────────────────── */}
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
              style={{ animation: "slideUp 0.5s ease-out 0.5s both" }}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">
                    Period Summary
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDisplayDate(dateRange.start)} →{" "}
                    {formatDisplayDate(dateRange.end)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-6 ml-auto">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {leaderboard.length}
                    </p>
                    <p className="text-xs text-slate-500">Active Staff</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-400">
                      {onTimeCount}
                    </p>
                    <p className="text-xs text-slate-500">On Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-rose-400">
                      {lateCount}
                    </p>
                    <p className="text-xs text-slate-500">Late</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-400">
                      {leaderboard[0]
                        ? `${safeToFixed(leaderboard[0].avg_hours_per_day)}h`
                        : "—"}
                    </p>
                    <p className="text-xs text-slate-500">Best Avg/Day</p>
                  </div>
                  <div className="text-center">
                    <p
                      className="text-lg font-bold text-blue-400 truncate max-w-[120px]"
                      title={topDept}
                    >
                      {topDept}
                    </p>
                    <p className="text-xs text-slate-500">Top Dept</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
