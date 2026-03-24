import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import ProtectedRoute from "./components/protectedRoutes";
import MainPage from "./pages/mainPage";
import DTRPage from "./pages/dtrPage";
import LoginPage from "./pages/loginPage";
import EmployeeLoginPage from "./pages/employeeLoginPage";
import EmployeeDashboardPage from "./pages/employeeDashboardPage";
import EmployeeSettingsPage from "./pages/employeeSettingsPage";
import NotFoundPage from "./pages/notFoundPage";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="w-full h-screen">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/employee-login" element={<EmployeeLoginPage />} />
            <Route path="/employee" element={<EmployeeDashboardPage />} />
            <Route path="/employee/settings" element={<EmployeeSettingsPage />} />
            <Route path="/dtr" element={<DTRPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <MainPage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dtr" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}
