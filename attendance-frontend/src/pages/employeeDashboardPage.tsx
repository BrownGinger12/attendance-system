import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { EmployeeInfo } from "../types/dashboard";
import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";
import AttendanceModal from "../components/dashboard/AttendanceModal";
import LogoutModal from "../components/dashboard/LogoutModal";
import EmployeeHomePage from "./EmployeeHomePage";
import EmployeeSettingsContent from "./EmployeeSettingsContent";
import EmployeeDepartmentPage from "./EmployeeDepartmentPage";

const API_URL = import.meta.env.VITE_API_URL;

type Page = "home" | "settings" | "department";

const EmployeeDashboardPage: React.FC = () => {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<Page>("home");

  // Attendance
  const [checkedIn, setCheckedIn] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"checkin" | "checkout" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const [homeResetKey, setHomeResetKey] = useState(0);

  // Logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (showAttendanceModal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
    } else {
      setModalVisible(false);
      setAttendanceSuccess(false);
      setSuccessVisible(false);
    }
  }, [showAttendanceModal]);

  useEffect(() => {
    if (showLogoutModal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setLogoutModalVisible(true)));
    } else {
      setLogoutModalVisible(false);
    }
  }, [showLogoutModal]);

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    const stored = localStorage.getItem("employeeData");
    if (!token || !stored) { navigate("/employee-login", { replace: true }); return; }

    const emp: EmployeeInfo = JSON.parse(stored);
    setEmployee(emp);
    setLoading(false);

    // Attendance status
    fetch(`${API_URL}/attendance/employee?user_id=${emp.id}&day=${today}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.statusCode === 200 && data.data.length > 0) {
          setCheckedIn(data.data[0].checktype === "I");
        } else {
          setCheckedIn(false);
        }
      })
      .catch(() => setCheckedIn(false))
      .finally(() => setStatusLoading(false));

    // Refresh avatar/name from profile
    fetch(`${API_URL}/employee/profile`, { headers: { "x-access-token": token } })
      .then((r) => r.json())
      .then((data) => {
        if (data.statusCode === 200) {
          const updated = { ...emp, name: data.name ?? emp.name, avatar_url: data.avatar_url ?? emp.avatar_url, role: data.role ?? emp.role, dept_id: data.dept_id ?? emp.dept_id };
          setEmployee(updated);
          localStorage.setItem("employeeData", JSON.stringify(updated));
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleEmployeeUpdate = (updated: EmployeeInfo) => {
    setEmployee(updated);
    localStorage.setItem("employeeData", JSON.stringify(updated));
  };

  const openAttendanceModal = () => {
    setErrorMessage(null);
    setAttendanceSuccess(false);
    setSuccessVisible(false);
    setShowAttendanceModal(true);
  };

  const handleAttendance = async () => {
    const token = localStorage.getItem("employeeToken");
    if (!token) return;
    const type = checkedIn ? "checkout" : "checkin";
    setActionLoading(type);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_URL}/employee/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": token },
      });
      const data = await res.json();
      if (!res.ok || (data.statusCode && data.statusCode !== 200))
        throw new Error(data.message || data.error || "Something went wrong");
      setCheckedIn(type === "checkin");
      setAttendanceSuccess(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSuccessVisible(true)));
      setTimeout(() => setShowAttendanceModal(false), 1800);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employeeData");
    navigate("/employee-login", { replace: true });
  };

  const renderPage = () => {
    switch (activePage) {
      case "settings":
        return <EmployeeSettingsContent employee={employee} onEmployeeUpdate={handleEmployeeUpdate} />;
      case "department":
        return <EmployeeDepartmentPage employee={employee} />;
      default:
        return <EmployeeHomePage employee={employee} resetKey={homeResetKey} />;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#f0f2f5] dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5] dark:bg-gray-900">
      <Sidebar
        employee={employee}
        sidebarOpen={sidebarOpen}
        activePage={activePage}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => setShowLogoutModal(true)}
        onPageChange={(page) => { setSidebarOpen(false); setActivePage(page as Page); }}
        onProfileClick={() => setHomeResetKey((k) => k + 1)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuOpen={() => setSidebarOpen(true)}
          statusLoading={statusLoading}
          checkedIn={checkedIn}
          onAttendanceClick={openAttendanceModal}
        />

        <main key={activePage} className="flex-1 overflow-y-auto animate-fade-in-up">
          {renderPage()}
        </main>
      </div>

      <AttendanceModal
        show={showAttendanceModal}
        visible={modalVisible}
        checkedIn={checkedIn}
        actionLoading={actionLoading}
        attendanceSuccess={attendanceSuccess}
        successVisible={successVisible}
        errorMessage={errorMessage}
        onClose={() => setShowAttendanceModal(false)}
        onConfirm={handleAttendance}
      />

      <LogoutModal
        show={showLogoutModal}
        visible={logoutModalVisible}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default EmployeeDashboardPage;
