import React from "react";
import { EmployeeInfo } from "../../types/dashboard";

interface Props {
  employee: EmployeeInfo | null;
}

const ProfileHeader: React.FC<Props> = ({ employee }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50">
      {/* Cover */}
      <div className="h-36 md:h-52 bg-gradient-to-br from-blue-700 via-blue-500 to-blue-400" />

      {/* Avatar + info */}
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 -mt-12 md:-mt-16 pb-4">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-800 shadow flex-shrink-0 overflow-hidden bg-blue-500 flex items-center justify-center text-white font-bold text-4xl md:text-5xl">
              {employee?.avatar_url
                ? <img src={`${import.meta.env.VITE_API_URL}${employee.avatar_url}`} alt={employee.name} className="w-full h-full object-cover" />
                : employee?.name.charAt(0)}
            </div>
            <div className="pb-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                {employee?.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{employee?.department}</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-slate-100 dark:border-gray-700 flex">
          <button className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 -mb-px">
            Posts
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
