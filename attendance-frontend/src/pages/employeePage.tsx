import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import employeeService, {
  Employee,
  Department,
} from "../services/employeeService";
import EmployeeModal from "../components/employeeModal";

interface EmployeeCache {
  [page: number]: {
    data: Employee[];
    timestamp: number;
  };
}

const EmployeePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Cache with useRef to persist across renders
  const cache = useRef<EmployeeCache>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Check if cached data is still valid
  const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await employeeService.getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  // Fetch employees with caching
  const fetchEmployees = async (page: number) => {
    // Check cache first
    const cachedData = cache.current[page];
    if (cachedData && isCacheValid(cachedData.timestamp)) {
      setEmployees(cachedData.data);
      setLoading(false);
      return;
    }

    // Fetch from API if not cached or cache expired
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees(page, itemsPerPage);
      setEmployees(response.data);
      setTotalPages(response.total_pages);
      setTotalEmployees(response.total_employees);

      // Store in cache
      cache.current[page] = {
        data: response.data,
        timestamp: Date.now(),
      };
    } catch (err) {
      setError("Failed to load employees. Please try again.");
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clear cache (can be called when data needs to be refreshed)
  const clearCache = () => {
    cache.current = {};
    fetchEmployees(currentPage);
  };

  // Initial load
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees(currentPage);
  }, [currentPage]);

  // Add key to force re-render animation on page change
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [currentPage]);

  // Get department name by ID
  const getDepartmentName = (deptId: number): string => {
    const department = departments.find((dept) => dept.DEPTID === deptId);
    return department ? department.DEPTNAME : `Dept ${deptId}`;
  };

  // Filter employees based on search query (client-side)
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.Badgenumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getDepartmentName(employee.DEFAULTDEPTID)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + filteredEmployees.length,
    totalEmployees,
  );

  // Handle employee row click
  const handleEmployeeClick = (userId: number) => {
    setSelectedUserId(userId);
    setShowModal(true);
  };

  // Handle modal update callback
  const handleEmployeeUpdate = () => {
    fetchEmployees(currentPage);
  };

  return (
    <div className="w-full h-full bg-slate-950 p-6">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Employees
            </h1>
            <p className="text-slate-400 text-sm">
              Manage and view employee information
            </p>
          </div>
          <button
            onClick={clearCache}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, badge number, or department..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div
          key={animationKey}
          className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden animate-fadeIn"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Department
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <tr
                      key={employee.USERID}
                      onClick={() => handleEmployeeClick(employee.USERID)}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {employee.Badgenumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {employee.Name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        <div className="flex flex-col">
                          <span>
                            {getDepartmentName(employee.DEFAULTDEPTID)}
                          </span>
                          <span className="text-xs text-slate-500">
                            ID: {employee.DEFAULTDEPTID}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredEmployees.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {startIndex + 1} to {endIndex} of {totalEmployees}{" "}
                employees
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-slate-300 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employee Modal */}
      {selectedUserId && (
        <EmployeeModal
          userId={selectedUserId}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onUpdate={handleEmployeeUpdate}
        />
      )}
    </div>
  );
};

export default EmployeePage;
