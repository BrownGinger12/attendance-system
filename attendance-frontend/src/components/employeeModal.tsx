import React, { useState, useEffect } from "react";
import { X, Edit2, Save, User } from "lucide-react";
import employeeService, { Department } from "../services/employeeService";

interface EmployeeModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface EmployeeInfo {
  USERID: number;
  Name: string;
  DEFAULTDEPTID: number;
  PHOTO: string | null;
  Badgenumber: string;
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
      setEditName(response.data.Name);
      setEditDeptId(response.data.DEFAULTDEPTID);

      // Handle photo - base64 string
      if (response.data.PHOTO) {
        const photoData = response.data.PHOTO.trim();
        // Check if it already has the data URL prefix
        if (photoData.startsWith("data:image")) {
          setPhotoPreview(photoData);
        } else {
          // Add the data URL prefix for base64 string
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

      if (editName !== employee?.Name) {
        payload.Name = editName;
      }

      if (editDeptId !== employee?.DEFAULTDEPTID) {
        payload.Deptid = editDeptId;
      }

      if (editPhoto) {
        // Convert photo to bytes (base64)
        const reader = new FileReader();
        const photoBytes = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix to get just the base64 string
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
    setEditName(employee?.Name || "");
    setEditDeptId(employee?.DEFAULTDEPTID || 0);
    setEditPhoto(null);

    // Reset photo preview
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

  const getDepartmentName = (deptId: number): string => {
    const dept = departments.find((d) => d.DEPTID === deptId);
    return dept ? dept.DEPTNAME : `Dept ${deptId}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Black overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-75 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md animate-fadeIn">
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

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
              </div>
            ) : error && !employee ? (
              <div className="text-center py-8 text-red-400">{error}</div>
            ) : employee ? (
              <div className="space-y-6">
                {/* Photo */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={employee.Name}
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

                {/* Name */}
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
                    <p className="text-white font-medium">{employee.Name}</p>
                  )}
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Employee ID
                  </label>
                  <p className="text-slate-300">{employee.Badgenumber}</p>
                </div>

                {/* Department */}
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
                      {getDepartmentName(employee.DEFAULTDEPTID)}
                    </p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {employee && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
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
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default EmployeeModal;
