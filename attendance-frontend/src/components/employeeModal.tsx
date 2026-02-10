import React, { useState, useEffect } from "react";
import { X, Edit2, Save, User, Download, Trash2 } from "lucide-react";
import employeeService, { Department } from "../services/employeeService";

interface EmployeeModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface EmployeeInfo {
  userid: number;
  name: string;
  defaultdeptid: number;
  PHOTO: string | null;
  badgenumber: string;
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

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDeptId, setEditDeptId] = useState(0);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployeeData();
      fetchDepartments();
    }
  }, [isOpen, userId]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployeeById(userId);
      setEmployee(response.data);
      setEditName(response.data.name);
      setEditDeptId(response.data.defaultdeptid);

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
        payload.Deptid = editDeptId;
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
      const currentDate = new Date();
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

      const attendanceResponse = await employeeService.getEmployeeAttendance(
        userId,
        month,
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

      // Call the export DTR API and get blob response
      const response = await fetch("http://10.10.10.2:5000/api/fill-dtr-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to export DTR");
      }

      // Get the blob (DOCX file)
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DTR_${employee?.name}_${month}.docx`;
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
    const dept = departments.find((d) => d.DEPTID === deptId);
    return dept ? dept.DEPTNAME : `Dept ${deptId}`;
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

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md animate-fadeIn">
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
                <div className="flex flex-col items-center">
                  <div className="relative">
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
                    <p className="text-white font-medium">{employee.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Employee ID
                  </label>
                  <p className="text-slate-300">{employee.badgenumber}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Department
                  </label>
                  {isEditing ? (
                    <select
                      value={editDeptId}
                      onChange={(e) => setEditDeptId(parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-600 transition-colors"
                    >
                      {departments.map((dept) => (
                        <option key={dept.DEPTID} value={dept.DEPTID}>
                          {dept.DEPTNAME}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-300">
                      {getDepartmentName(employee.defaultdeptid)}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {employee && (
            <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportDTR}
                  disabled={exporting || isEditing}
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
