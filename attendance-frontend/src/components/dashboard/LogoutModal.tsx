import React from "react";
import { X } from "lucide-react";
import { createPortal, useScrollLock } from "../../hooks/useModalPortal";

interface Props {
  show: boolean;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<Props> = ({ show, visible, onCancel, onConfirm }) => {
  useScrollLock(show);
  if (!show) return null;

  return createPortal(
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Confirm Logout</h2>
          <button
            onClick={onCancel}
            className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Are you sure you want to log out?</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutModal;
