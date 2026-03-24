import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, BadgeCheck, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const EmployeeLoginPage: React.FC = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim()) {
      setError("Please enter your Employee ID");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/employee/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge_number: employeeId, password }),
      });

      const data = await res.json();

      if (!res.ok || data.statusCode !== 200) {
        throw new Error(data.message || "Invalid Employee ID or password");
      }

      localStorage.setItem("employeeToken", data.token);
      localStorage.setItem("employeeData", JSON.stringify(data.employee));

      navigate("/employee", { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid Employee ID or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-100 flex items-center justify-center p-6">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>

      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4">
            <img
              src={`${import.meta.env.BASE_URL}deped_logo.png`}
              alt="DEPED Logo"
              className="w-15 h-15 object-contain"
            />
          </div>
          <h1 className="text-3xl font-semibold text-slate-800 mb-2">
            Employee Portal
          </h1>
          <p className="text-slate-500 text-sm">
            Sign in to view your attendance records
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="employeeId"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Employee ID
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="employeeId"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter your Employee ID"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Attendance Management System © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLoginPage;
