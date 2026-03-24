import React from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  show: boolean;
  visible: boolean;
  checkedIn: boolean;
  actionLoading: "checkin" | "checkout" | null;
  attendanceSuccess: boolean;
  successVisible: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const AttendanceModal: React.FC<Props> = ({
  show, visible, checkedIn, actionLoading,
  attendanceSuccess, successVisible, errorMessage,
  onClose, onConfirm,
}) => {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-sm p-6 transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {attendanceSuccess ? (
          <div className="flex flex-col items-center py-2">
            <div className={`transition-all duration-300 ${successVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
              <CheckCircle2
                className={`w-14 h-14 mb-3 ${checkedIn ? "text-green-500" : "text-orange-400"}`}
                strokeWidth={1.5}
              />
            </div>
            <p className={`text-base font-semibold text-slate-800 dark:text-white transition-all duration-300 delay-100 ${successVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              {checkedIn ? "Checked In!" : "Checked Out!"}
            </p>
            <p className={`text-sm text-slate-400 dark:text-gray-500 mt-1 transition-all duration-300 delay-150 ${successVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              {checkedIn ? "Your attendance has been recorded." : "See you next time!"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">
                {checkedIn ? "Confirm Check Out" : "Confirm Check In"}
              </h2>
              <button
                onClick={onClose}
                disabled={actionLoading !== null}
                className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
              {checkedIn ? "Are you sure you want to check out?" : "Are you sure you want to check in?"}
            </p>
            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-4">
                {errorMessage}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={actionLoading !== null}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={actionLoading !== null}
                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  checkedIn ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {actionLoading !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                {checkedIn ? "Check Out" : "Check In"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceModal;
