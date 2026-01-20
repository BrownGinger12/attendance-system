import React, { useState } from "react";
import Navbar from "../components/navBar";
import Sidebar from "../components/sideBar";
import EmployeePage from "./employeePage";
import AttendanceRecordPage from "./attendancePage";

const MainPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activePage, setActivePage] = useState<string>("employee");

  const renderPage = () => {
    switch (activePage) {
      case "employee":
        return <EmployeePage />;
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
        return (
          <div className="text-white">
            <h1 className="text-2xl font-semibold mb-2">
              Real-time Attendance
            </h1>
            <p className="text-slate-400">
              Real-time attendance page coming soon...
            </p>
          </div>
        );
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
        <main className="flex-1 overflow-auto bg-slate-950 p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default MainPage;
