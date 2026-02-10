import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center p-6">
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

      <div className="w-full max-w-md text-center animate-fadeIn">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-3">
          Page Not Found
        </h2>
        <p className="text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>

          <button
            onClick={() => navigate("/dtr")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </button>
        </div>

        <div className="mt-12">
          <p className="text-slate-500 text-sm">
            Attendance Management System © 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
