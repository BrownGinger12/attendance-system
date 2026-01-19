import React, { useState } from "react";
import { Menu, X, User, PanelLeftClose, PanelLeft } from "lucide-react";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full bg-slate-900 border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            {/* Logo Placeholder */}
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

          {/* Desktop Profile */}
          <div className="hidden md:flex ml-auto">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200">
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Profile</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
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

      {/* Mobile Profile */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-800">
          <div className="px-2 pt-2 pb-3">
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-200">
              <User className="w-5 h-5" />
              <span className="text-base font-medium">Profile</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
