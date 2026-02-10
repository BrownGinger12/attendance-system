import React, { useState, useRef, useEffect } from "react";
import { Menu, X, User, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import LogoutModal from "./logoutModal";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDesktop =
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(event.target as Node);
      const isOutsideMobile =
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target as Node);

      if (isOutsideDesktop && isOutsideMobile) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleLogoutClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Logout button clicked!"); // Debug log
    setShowLogoutModal(true);
    setIsOpen(false);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/login");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleProfile = () => {
    // TODO: Navigate to profile page or open profile modal
    console.log("Profile clicked");
    setIsOpen(false);
  };

  const handleSettings = () => {
    // TODO: Navigate to settings page or open settings modal
    console.log("Settings clicked");
    setIsOpen(false);
  };

  return (
    <>
      <nav className="w-full bg-slate-900 border-b border-slate-800">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                <img
                  src="/deped_logo.png"
                  alt="DEPED Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-white tracking-tight">
                  Division Attendance Tracker
                </h1>
              </div>
            </div>

            {/* Desktop Menu Button */}
            <div
              className="hidden md:flex ml-auto relative"
              ref={desktopDropdownRef}
            >
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200"
              >
                {isOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">Menu</span>
              </button>

              {/* Desktop Dropdown */}
              {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-sm font-medium text-white">
                      {user?.username || "Admin"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Administrator
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={handleSettings}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>

                    <div className="my-2 border-t border-slate-800"></div>

                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden" ref={mobileDropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-200"
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="md:hidden border-t border-slate-800">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-medium text-white">
                {user?.username || "Admin"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Administrator</p>
            </div>

            {/* Menu Items */}
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                type="button"
                onClick={handleProfile}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200"
              >
                <User className="w-5 h-5" />
                <span className="text-base font-medium">Profile</span>
              </button>

              <button
                type="button"
                onClick={handleSettings}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200"
              >
                <Settings className="w-5 h-5" />
                <span className="text-base font-medium">Settings</span>
              </button>

              <div className="my-2 border-t border-slate-800"></div>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-base font-medium">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </>
  );
};

export default Navbar;
