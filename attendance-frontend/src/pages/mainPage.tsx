import React, { useState } from "react";
import Navbar from "../components/navBar";
import Sidebar from "../components/sideBar";
import EmployeePage from "./employeePage";
import AttendanceRecordPage from "./attendancePage";
import RealtimeAttendancePage from "./realtimeAttendancePage";
import DepartmentsPage from "./departmentPage";
import LeaderboardPage from "./leaderBoardPage";

const MainPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activePage, setActivePage] = useState<string>("employee");

  const renderPage = () => {
    switch (activePage) {
      case "employee":
        return <EmployeePage />;
      case "employeeStat":
        return <LeaderboardPage />;
      case "attendance":
        return <AttendanceRecordPage />;
      case "dashboard":
        return (
          <div className="text-white">
            <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
            <p className="text-slate-400">Dashboard page coming soon...</p>
          </div>
        );

      case "realtimeAttendance":
        return <RealtimeAttendancePage />;
      case "departments":
        return <DepartmentsPage />;
      default:
        return <EmployeePage />;
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
