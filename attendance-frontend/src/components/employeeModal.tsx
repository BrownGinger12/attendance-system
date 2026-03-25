import React, { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Save,
  User,
  Download,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import employeeService, {
  Department,
  AttendanceRecord,
} from "../services/employeeService";

interface EmployeeModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "department_head", label: "Department Head" },
  { value: "admin", label: "Admin" },
] as const;

interface EmployeeInfo {
  userid: number;
  name: string;
  defaultdeptid: number;
  PHOTO: string | null;
  badgenumber: string;
  role: string | null;
}

interface GroupedAttendance {
  date: string;
  amCheckIn?: string;
  amCheckOut?: string;
  pmCheckIn?: string;
  pmCheckOut?: string;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({
  userId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DTR state
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );
  const [attendanceData, setAttendanceData] = useState<GroupedAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDeptId, setEditDeptId] = useState(0);
  const [editBadgeNumber, setEditBadgeNumber] = useState("");
  const [editRole, setEditRole] = useState("employee");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployeeData();
      fetchDepartments();
      fetchAttendance();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen && employee) {
      fetchAttendance();
    }
  }, [selectedMonth]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployeeById(userId);
      setEmployee(response.data);
      setEditName(response.data.name);
      setEditDeptId(response.data.defaultdeptid);
      setEditBadgeNumber(response.data.badgenumber);
      setEditRole(response.data.role ?? "employee");

      // Handle photo - base64 string
      if (response.data.PHOTO) {
        const photoData = response.data.PHOTO.trim();
        if (photoData.startsWith("data:image")) {
          setPhotoPreview(photoData);
        } else {
          setPhotoPreview(`data:image/jpeg;base64,${photoData}`);
        }
      } else {
        setPhotoPreview(null);
      }
    } catch (err) {
      setError("Failed to load employee data");
      console.error("Error fetching employee:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await employeeService.getDepartments();
      setDepartments(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const response = await employeeService.getEmployeeAttendance(
        userId,
        selectedMonth,
      );

      const grouped = groupAttendanceByDate(response.data || []);
      setAttendanceData(grouped);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setAttendanceData([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const groupAttendanceByDate = (
    records: AttendanceRecord[],
  ): GroupedAttendance[] => {
    const grouped: { [key: string]: GroupedAttendance } = {};

    records.forEach((record) => {
      const timeMatch = record.checktime.match(/\d{2}:\d{2}:\d{2}/);
      const dateMatch = record.checktime.match(/\d{2} \w{3} \d{4}/);

      if (!timeMatch || !dateMatch) return;

      const time = timeMatch[0];
      const hour = parseInt(time.split(":")[0]);
      const minute = parseInt(time.split(":")[1]);
      const date = new Date(record.checktime).toISOString().split("T")[0];

      if (!grouped[date]) {
        grouped[date] = { date };
      }

      const isAM = hour < 12 || (hour === 12 && minute < 30);

      let effectiveCheckType = record.checktype;

      if (record.checktype === "I") {
        if (isAM && hour >= 11) {
          effectiveCheckType = "O";
        } else if (!isAM && hour >= 16) {
          effectiveCheckType = "O";
        }
      }

      if (effectiveCheckType === "I") {
        if (isAM) {
          if (!grouped[date].amCheckIn || time < grouped[date].amCheckIn!) {
            grouped[date].amCheckIn = time;
          }
        } else {
          if (!grouped[date].pmCheckIn || time < grouped[date].pmCheckIn!) {
            grouped[date].pmCheckIn = time;
          }
        }
      } else if (effectiveCheckType === "O") {
        if (isAM) {
          if (!grouped[date].amCheckIn || time > grouped[date].amCheckIn) {
            if (!grouped[date].amCheckOut || time > grouped[date].amCheckOut!) {
              grouped[date].amCheckOut = time;
            }
          }
        } else {
          if (!grouped[date].pmCheckIn || time > grouped[date].pmCheckIn) {
            if (!grouped[date].pmCheckOut || time > grouped[date].pmCheckOut!) {
              grouped[date].pmCheckOut = time;
            }
          }
        }
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const previousMonth = () => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {};

      if (editName !== employee?.name) {
        payload.Name = editName;
      }

      if (editDeptId !== employee?.defaultdeptid) {
        payload.defaultdeptid = editDeptId;
      }

      if (editBadgeNumber !== employee?.badgenumber) {
        payload.badgenumber = editBadgeNumber;
      }

      if (editRole !== (employee?.role ?? "employee")) {
        payload.role = editRole;
      }

      if (editPhoto) {
        const reader = new FileReader();
        const photoBytes = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
          };
          reader.readAsDataURL(editPhoto);
        });
        payload.Photo = photoBytes;
      }

      await employeeService.updateEmployee(userId, payload);

      setIsEditing(false);
      await fetchEmployeeData();
      onUpdate?.();
    } catch (err) {
      setError("Failed to update employee");
      console.error("Error updating employee:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(employee?.name || "");
    setEditDeptId(employee?.defaultdeptid || 0);
    setEditBadgeNumber(employee?.badgenumber || "");
    setEditRole(employee?.role ?? "employee");
    setEditPhoto(null);

    if (employee?.PHOTO) {
      const photoData = employee.PHOTO.trim();
      if (photoData.startsWith("data:image")) {
        setPhotoPreview(photoData);
      } else {
        setPhotoPreview(`data:image/jpeg;base64,${photoData}`);
      }
    } else {
      setPhotoPreview(null);
    }
    setError(null);
  };

  const handleExportDTR = async () => {
    setExporting(true);
    setError(null);
    try {
      const attendanceResponse = await employeeService.getEmployeeAttendance(
        userId,
        selectedMonth,
      );

      if (!attendanceResponse.data || attendanceResponse.data.length === 0) {
        setError("No attendance data found for this month");
        setExporting(false);
        return;
      }

      const payload = {
        name: employee?.name || "Unknown",
        data: attendanceResponse.data,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/fill-dtr-json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export DTR");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTR_${employee?.name}_${selectedMonth}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to export DTR");
      console.error("Error exporting DTR:", err);
    } finally {
      setExporting(false);
    }
  };

  const getDepartmentName = (deptId: number): string => {
    const dept = departments.find((d) => d.deptid === deptId);
    return dept ? dept.deptname : `Dept ${deptId}`;
  };

  const handleDeleteEmployee = async () => {
    setDeleting(true);
    setError(null);
    try {
      await employeeService.deleteEmployee(userId);
      onUpdate?.();
      onClose();
    } catch (err) {
      setError("Failed to delete employee");
      console.error("Error deleting employee:", err);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-4xl my-8 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? "Edit Employee" : "Employee Information"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
              </div>
            ) : error && !employee ? (
              <div className="text-center py-8 text-red-400">{error}</div>
            ) : employee ? (
              <div className="space-y-6">
                {/* Employee Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Photo and Basic Info */}
                  <div className="space-y-4">
                    <div className="flex flex-col items-center md:items-start">
                      <div className="relative mb-4">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt={employee.name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-slate-800"
                          />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center">
                            <User className="w-16 h-16 text-slate-600" />
                          </div>
                        )}
                        {isEditing && (
                          <label className="absolute bottom-0 right-0 p-2 bg-slate-800 rounded-full border-2 border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
                            <Edit2 className="w-4 h-4 text-slate-300" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-600 transition-colors"
                        />
                      ) : (
                        <p className="text-white font-medium">
                          {employee.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Employee ID
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editBadgeNumber}
                          onChange={(e) => setEditBadgeNumber(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-600 transition-colors"
                          placeholder="Enter employee ID"
                        />
                      ) : (
                        <p className="text-slate-300">{employee.badgenumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Department
                      </label>
                      {isEditing ? (
                        <select
                          value={editDeptId}
                          onChange={(e) =>
                            setEditDeptId(parseInt(e.target.value))
                          }
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-600 transition-colors"
                        >
                          {departments.map((dept) => (
                            <option key={dept.deptid} value={dept.deptid}>
                              {dept.deptname}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-slate-300">
                          {getDepartmentName(employee.defaultdeptid)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Role
                      </label>
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-600 transition-colors"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-slate-300">
                          {ROLES.find(
                            (r) => r.value === (employee.role ?? "employee"),
                          )?.label ?? "Employee"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column - DTR Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Attendance Summary
                      </label>
                      <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button
                          onClick={previousMonth}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <div className="flex items-center gap-2 px-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-slate-300 text-sm font-medium focus:outline-none cursor-pointer"
                          />
                        </div>
                        <button
                          onClick={nextMonth}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {loadingAttendance ? (
                          <div className="flex items-center justify-center py-8">
                            <Clock className="w-6 h-6 text-slate-400 animate-spin" />
                          </div>
                        ) : attendanceData.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-700 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                  Date
                                </th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase">
                                  AM In
                                </th>
                                <th className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase">
                                  PM Out
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                              {attendanceData
                                .slice(0, 8)
                                .map((record, index) => (
                                  <tr
                                    key={index}
                                    className="hover:bg-slate-700/50"
                                  >
                                    <td className="px-3 py-2 text-slate-300 font-medium">
                                      {new Date(record.date).toLocaleDateString(
                                        "en-US",
                                        {
                                          month: "short",
                                          day: "numeric",
                                        },
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <span
                                        className={
                                          record.amCheckIn
                                            ? "text-green-400"
                                            : "text-slate-600"
                                        }
                                      >
                                        {record.amCheckIn || "--:--"}
                                      </span>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <span
                                        className={
                                          record.pmCheckOut
                                            ? "text-green-400"
                                            : "text-slate-600"
                                        }
                                      >
                                        {record.pmCheckOut || "--:--"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="py-8 text-center text-slate-500 text-sm">
                            No attendance records
                          </div>
                        )}
                      </div>
                      {attendanceData.length > 8 && (
                        <div className="px-3 py-2 bg-slate-700 text-xs text-slate-400 text-center">
                          +{attendanceData.length - 8} more days
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full DTR Table */}
                <div className="mt-6">
                  <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-700 border-b border-slate-600">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Complete Attendance Record
                      </h3>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto">
                      {loadingAttendance ? (
                        <div className="flex items-center justify-center py-12">
                          <Clock className="w-8 h-8 text-slate-400 animate-spin" />
                        </div>
                      ) : attendanceData.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-slate-700 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                                AM In
                              </th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                                AM Out
                              </th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                                PM In
                              </th>
                              <th className="px-3 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">
                                PM Out
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {attendanceData.map((record, index) => (
                              <tr key={index} className="hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-slate-200 font-medium">
                                  {formatDate(record.date)}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span
                                    className={
                                      record.amCheckIn
                                        ? "text-green-400"
                                        : "text-slate-600"
                                    }
                                  >
                                    {record.amCheckIn || "--:--:--"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span
                                    className={
                                      record.amCheckOut
                                        ? "text-green-400"
                                        : "text-slate-600"
                                    }
                                  >
                                    {record.amCheckOut || "--:--:--"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span
                                    className={
                                      record.pmCheckIn
                                        ? "text-green-400"
                                        : "text-slate-600"
                                    }
                                  >
                                    {record.pmCheckIn || "--:--:--"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span
                                    className={
                                      record.pmCheckOut
                                        ? "text-green-400"
                                        : "text-slate-600"
                                    }
                                  >
                                    {record.pmCheckOut || "--:--:--"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="py-12 text-center text-slate-500">
                          No attendance records found for this month
                        </div>
                      )}
                    </div>
                    {attendanceData.length > 0 && (
                      <div className="px-4 py-3 bg-slate-700 border-t border-slate-600 flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          Total records:{" "}
                          <span className="font-semibold text-slate-200">
                            {attendanceData.length}
                          </span>
                        </p>
                        {attendanceData.length > 6 && (
                          <p className="text-xs text-slate-400">
                            Scroll to see all records
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {employee && (
            <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportDTR}
                  disabled={
                    exporting || isEditing || attendanceData.length === 0
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export DTR
                    </>
                  )}
                </button>

                {!isEditing && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-sm relative z-10 animate-fadeIn">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-900/30 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Delete Employee
                  </h3>
                  <p className="text-sm text-slate-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-white">
                  {employee?.name}
                </span>
                ? All associated data will be permanently removed.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Employee"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default EmployeeModal;
