import React, { useState } from "react";
import Navbar from "../components/navBar";
import Sidebar from "../components/sideBar";
import EmployeePage from "./employeePage";
import AttendanceRecordPage from "./attendancePage";
import RealtimeAttendancePage from "./realtimeAttendancePage";
import DepartmentsPage from "./departmentPage";
import LeaderboardPage from "./leaderBoardPage";
import DashboardPage from "./dashBoardPage";

const MainPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activePage, setActivePage] = useState<string>("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "employee":
        return <EmployeePage />;
      case "employeeStat":
        return <LeaderboardPage />;
      case "attendance":
        return <AttendanceRecordPage />;
      case "dashboard":
        return <DashboardPage />;
      case "realtimeAttendance":
        return <RealtimeAttendancePage />;
      case "departments":
        return <DepartmentsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
          activePage={activePage}
          onPageChange={setActivePage}
        />
        <main className="flex-1 overflow-auto bg-slate-950">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default MainPage;
