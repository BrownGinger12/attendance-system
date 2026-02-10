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
import NotFoundPage from "./pages/notFoundPage";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="w-full h-screen">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dtr" element={<DTRPage />} />

            {/* Protected admin route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <MainPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to DTR */}
            <Route path="/" element={<Navigate to="/dtr" replace />} />

            {/* 404 Not Found - catch all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}
