import React, { useState, useEffect } from "react";
import {
  Users,
  User,
  Building2,
  Loader2,
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import employeeService, { EmployeeDetail } from "../services/employeeService";
import EmployeeModal from "../components/employeeModal";

interface Department {
  deptid: number;
  deptname: string;
  supdeptid: number;
}

interface EmployeeStatus {
  userId: number;
  isInOffice: boolean;
  lastCheckIn?: string;
  lastCheckOut?: string;
}

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeStatuses, setEmployeeStatuses] = useState<Map<number, EmployeeStatus>>(new Map());

  // Create
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Edit
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentClick = async (dept: Department) => {
    setSelectedDepartment(dept);
    setLoadingEmployees(true);
    setEmployees([]);
    setSearchQuery("");
    setEmployeeStatuses(new Map());
    try {
      const response = await employeeService.getEmployeesByDepartment(dept.deptid);
      const employeeList = response.data || [];
      setEmployees(employeeList);
      await fetchEmployeeStatuses(employeeList);
    } catch (err) {
      console.error("Error fetching department employees:", err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchEmployeeStatuses = async (employeeList: EmployeeDetail[]) => {
    const today = new Date().toISOString().split("T")[0];
    const statusMap = new Map<number, EmployeeStatus>();
    try {
      const response = await employeeService.getAttendanceByDay(today);
      const allRecords = response.data;
      employeeList.forEach((employee) => {
        const records = allRecords.filter((record) => record.userid === employee.userid);
        if (records.length > 0) {
          const sortedRecords = records.sort(
            (a, b) => new Date(b.checktime).getTime() - new Date(a.checktime).getTime(),
          );
          const latestRecord = sortedRecords[0];
          const isInOffice = latestRecord.checktype === "I";
          const lastCheckIn = records
            .filter((r) => r.checktype === "I")
            .sort((a, b) => new Date(b.checktime).getTime() - new Date(a.checktime).getTime())[0];
          const lastCheckOut = records
            .filter((r) => r.checktype === "O")
            .sort((a, b) => new Date(b.checktime).getTime() - new Date(a.checktime).getTime())[0];
          statusMap.set(employee.userid, {
            userId: employee.userid,
            isInOffice,
            lastCheckIn: lastCheckIn?.checktime,
            lastCheckOut: lastCheckOut?.checktime,
          });
        } else {
          statusMap.set(employee.userid, { userId: employee.userid, isInOffice: false });
        }
      });
      setEmployeeStatuses(statusMap);
    } catch (err) {
      console.error("Error fetching attendance statuses:", err);
      employeeList.forEach((employee) => {
        statusMap.set(employee.userid, { userId: employee.userid, isInOffice: false });
      });
      setEmployeeStatuses(statusMap);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      await employeeService.createDepartment(createName.trim());
      setCreateName("");
      setShowCreateForm(false);
      await fetchDepartments();
    } catch (err) {
      console.error("Error creating department:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingDept || !editName.trim()) return;
    setEditLoading(true);
    try {
      await employeeService.updateDepartment(editingDept.deptid, editName.trim());
      setEditingDept(null);
      await fetchDepartments();
    } catch (err) {
      console.error("Error updating department:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setDeleteLoading(true);
    try {
      await employeeService.deleteDepartment(deletingDept.deptid);
      setDeletingDept(null);
      await fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setEmployees([]);
    setSearchQuery("");
  };

  const handleEmployeeClick = (userId: number) => {
    setSelectedEmployeeId(userId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEmployeeId(null);
  };

  const handleEmployeeUpdate = () => {
    if (selectedDepartment) handleDepartmentClick(selectedDepartment);
  };

  const getPhotoUrl = (employee: EmployeeDetail): string | null => {
    if (!employee.PHOTO) return null;
    const photoData = employee.PHOTO.trim();
    if (photoData.startsWith("data:image")) return photoData;
    return `data:image/jpeg;base64,${photoData}`;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getEmployeeStatus = (userId: number): EmployeeStatus | undefined => {
    return employeeStatuses.get(userId);
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.badgenumber.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950 p-6">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          {selectedDepartment ? (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleBackToDepartments}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-white">{selectedDepartment.deptname}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-slate-400 text-sm">
                    {employees.length} employee{employees.length !== 1 ? "s" : ""}
                  </p>
                  {employeeStatuses.size > 0 && (
                    <>
                      <span className="text-slate-600">•</span>
                      <p className="text-sm">
                        <span className="text-green-400 font-medium">
                          {Array.from(employeeStatuses.values()).filter((s) => s.isInOffice).length}
                        </span>
                        <span className="text-slate-400"> in office</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white mb-2">Departments</h1>
                <p className="text-slate-400 text-sm">Select a department to view employees</p>
              </div>
              <button
                onClick={() => { setShowCreateForm(true); setCreateName(""); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Department
              </button>
            </div>
          )}
        </div>

        {/* Search Bar (only shown when viewing employees) */}
        {selectedDepartment && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees by name or badge number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {selectedDepartment ? (
          <div className="animate-fadeIn">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
              </div>
            ) : filteredEmployees.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredEmployees.map((employee) => {
                    const status = getEmployeeStatus(employee.userid);
                    return (
                      <button
                        key={employee.userid}
                        onClick={() => handleEmployeeClick(employee.userid)}
                        className="group bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-200"
                      >
                        <div className="mb-3 relative">
                          {getPhotoUrl(employee) ? (
                            <img
                              src={getPhotoUrl(employee)!}
                              alt={employee.name}
                              className="w-full aspect-square rounded-md object-cover border border-slate-700 group-hover:border-slate-600 transition-colors"
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-md bg-slate-800 border border-slate-700 group-hover:border-slate-600 flex items-center justify-center transition-colors">
                              <User className="w-10 h-10 text-slate-600" />
                            </div>
                          )}
                          {status && (
                            <div className="absolute -top-1 -right-1">
                              <div
                                className={`w-3 h-3 rounded-full border-2 border-slate-900 ${status.isInOffice ? "bg-green-500" : "bg-slate-600"}`}
                                title={
                                  status.isInOffice
                                    ? `In office since ${status.lastCheckIn ? formatTime(status.lastCheckIn) : "today"}`
                                    : status.lastCheckOut
                                      ? `Left at ${formatTime(status.lastCheckOut)}`
                                      : "Not in office"
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-white text-sm mb-1 line-clamp-2 group-hover:text-slate-200 transition-colors">
                            {employee.name}
                          </h3>
                          <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors mb-1">
                            {employee.badgenumber}
                          </p>
                          {employee.role && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${
                              employee.role === "admin"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : employee.role === "department_head"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                              {employee.role === "department_head" ? "Dept. Head" : employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                            </span>
                          )}
                          {status && (
                            <div className="mt-2">
                              {status.isInOffice ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                  In Office
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                                  Out
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {searchQuery && (
                  <div className="mt-6 px-6 py-4 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-sm text-slate-400">
                      Showing {filteredEmployees.length} of {employees.length} employees
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchQuery ? "No Employees Found" : "No Employees"}
                </h3>
                <p className="text-slate-400 text-sm">
                  {searchQuery ? "No employees match your search criteria" : "This department doesn't have any employees yet"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fadeIn">
            {/* Create form */}
            {showCreateForm && (
              <div className="mb-4 bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
                <input
                  autoFocus
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreateForm(false); }}
                  placeholder="Department name..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleCreate}
                  disabled={createLoading || !createName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {departments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <div key={dept.deptid} className="group relative bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-200">
                    {/* Edit inline */}
                    {editingDept?.deptid === dept.deptid ? (
                      <div className="p-4 flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingDept(null); }}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button onClick={handleEditSave} disabled={editLoading} className="p-2 text-green-400 hover:bg-slate-700 rounded-lg transition-colors">
                          {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingDept(null)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDepartmentClick(dept)}
                        className="w-full p-6 text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center shrink-0 group-hover:border-slate-600 group-hover:bg-slate-700/80 transition-all">
                            <Building2 className="w-6 h-6 text-slate-400 group-hover:text-slate-300 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium text-white mb-1 group-hover:text-slate-200 transition-colors truncate">
                              {dept.deptname}
                            </h3>
                            <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-400 transition-colors">
                              <Users className="w-3.5 h-3.5" />
                              <span className="text-xs">View Employees</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Action buttons (shown on hover, hidden during edit) */}
                    {editingDept?.deptid !== dept.deptid && (
                      <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingDept(dept); setEditName(dept.deptname); }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingDept(dept); }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Departments Found</h3>
                <p className="text-slate-400">There are no departments to display at this time.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Department</h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to delete <span className="text-white font-medium">"{deletingDept.deptname}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingDept(null)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {selectedEmployeeId && (
        <EmployeeModal
          userId={selectedEmployeeId}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onUpdate={handleEmployeeUpdate}
        />
      )}
    </div>
  );
};

export default DepartmentsPage;
