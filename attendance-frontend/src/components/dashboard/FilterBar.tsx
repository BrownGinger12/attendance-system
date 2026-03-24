import React from "react";
import { CalendarDays } from "lucide-react";
import { DateFilter } from "../../types/dashboard";

interface Props {
  dateFilter: DateFilter;
  customFrom: string;
  customTo: string;
  today: string;
  onFilterChange: (f: DateFilter) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}

const LABELS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

const FilterBar: React.FC<Props> = ({
  dateFilter, customFrom, customTo, today,
  onFilterChange, onCustomFromChange, onCustomToChange,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Filter Posts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              dateFilter === key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {dateFilter === "custom" && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-500 dark:text-gray-400 mb-1 block">From</label>
            <input
              type="date"
              value={customFrom}
              max={customTo || today}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 dark:text-gray-400 mb-1 block">To</label>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
