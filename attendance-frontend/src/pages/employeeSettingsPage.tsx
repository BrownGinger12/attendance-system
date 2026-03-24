import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Camera, User, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { EmployeeInfo } from "../types/dashboard";
import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";
import AvatarCropModal from "../components/dashboard/AvatarCropModal";

const API_URL = import.meta.env.VITE_API_URL;

const EmployeeSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // Avatar
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Name
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    const stored = localStorage.getItem("employeeData");
    if (!token || !stored) { navigate("/employee-login", { replace: true }); return; }

    const emp: EmployeeInfo = JSON.parse(stored);
    setEmployee(emp);
    setName(emp.name);

    // Fetch latest profile (avatar_url)
    fetch(`${API_URL}/employee/profile`, { headers: { "x-access-token": token } })
      .then((r) => r.json())
      .then((data) => {
        if (data.statusCode === 200) {
          const updated: EmployeeInfo = { ...emp, name: data.name, avatar_url: data.avatar_url };
          setEmployee(updated);
          setName(data.name);
          localStorage.setItem("employeeData", JSON.stringify(updated));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employeeData");
    navigate("/employee-login", { replace: true });
  };

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Open crop modal with the raw image
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setAvatarSuccess(false);
    setAvatarError(null);
    e.target.value = "";
  };

  const onCropDone = (blob: Blob, previewUrl: string) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setAvatarPreview(previewUrl);
    setAvatarFile(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
  };

  const onCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    const token = localStorage.getItem("employeeToken");
    if (!token) return;
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await fetch(`${API_URL}/employee/profile/avatar`, {
        method: "PUT",
        headers: { "x-access-token": token },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update avatar");
      const updated: EmployeeInfo = { ...employee!, avatar_url: data.avatar_url };
      setEmployee(updated);
      localStorage.setItem("employeeData", JSON.stringify(updated));
      setAvatarFile(null);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: any) {
      setAvatarError(err.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  // ── Name ────────────────────────────────────────────────────────────────────
  const saveName = async () => {
    const token = localStorage.getItem("employeeToken");
    if (!token || !name.trim()) return;
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch(`${API_URL}/employee/profile/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-access-token": token },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update name");
      const updated: EmployeeInfo = { ...employee!, name: name.trim() };
      setEmployee(updated);
      localStorage.setItem("employeeData", JSON.stringify(updated));
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message);
    } finally {
      setNameSaving(false);
    }
  };

  // ── Password ─────────────────────────────────────────────────────────────────
  const savePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    const token = localStorage.getItem("employeeToken");
    if (!token) return;
    setPwSaving(true);
    setPwError(null);
    try {
      const res = await fetch(`${API_URL}/employee/profile/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-access-token": token },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to change password");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const currentAvatar = avatarPreview ?? (employee?.avatar_url ? `${API_URL}${employee.avatar_url}` : null);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#f0f2f5] dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5] dark:bg-gray-900">
      <Sidebar
        employee={employee}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => setShowLogout(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuOpen={() => setSidebarOpen(true)}
          statusLoading={false}
          checkedIn={false}
          onAttendanceClick={() => {}}
        />

        <div className="flex-1 overflow-y-auto animate-fade-in-up">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h1>

            {/* ── Profile Picture ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Camera className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-800 dark:text-white">Profile Picture</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar preview */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center text-white font-bold text-3xl ring-4 ring-blue-100 dark:ring-blue-900/40">
                    {currentAvatar
                      ? <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      : employee?.name.charAt(0)}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-3">
                    JPG, PNG, GIF or WebP. Max 5 MB.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Choose photo
                    </button>
                    {avatarFile && (
                      <button
                        onClick={saveAvatar}
                        disabled={avatarSaving}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
                      >
                        {avatarSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save photo
                      </button>
                    )}
                    {avatarSuccess && (
                      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Saved
                      </span>
                    )}
                  </div>
                  {avatarError && <p className="text-xs text-red-500 mt-2">{avatarError}</p>}
                </div>
              </div>

              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />

              {cropSrc && (
                <AvatarCropModal
                  imageSrc={cropSrc}
                  onCancel={onCropCancel}
                  onCrop={onCropDone}
                />
              )}
            </div>

            {/* ── Display Name ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-800 dark:text-white">Display Name</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameSuccess(false); setNameError(null); }}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveName}
                    disabled={nameSaving || name.trim() === employee?.name}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {nameSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save changes
                  </button>
                  {nameSuccess && (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Saved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Change Password ── */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-800 dark:text-white">Change Password</h2>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Current Password", value: oldPassword, set: setOldPassword, show: showOld, toggle: () => setShowOld(!showOld) },
                  { label: "New Password", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew) },
                  { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
                ].map(({ label, value, set, show, toggle }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5">{label}</label>
                    <div className="relative">
                      <input
                        type={show ? "text" : "password"}
                        value={value}
                        onChange={(e) => { set(e.target.value); setPwSuccess(false); setPwError(null); }}
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={toggle}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
                      >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-slate-400 dark:text-gray-500">
                  8–16 characters · uppercase · lowercase · number · symbol
                </p>

                {pwError && <p className="text-xs text-red-500">{pwError}</p>}

                <div className="flex items-center gap-3">
                  <button
                    onClick={savePassword}
                    disabled={pwSaving || !oldPassword || !newPassword || !confirmPassword}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {pwSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Update password
                  </button>
                  {pwSuccess && (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Password updated
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Simple logout confirm */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">Sign out?</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-5">You will be redirected to the login page.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogout(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              <button onClick={handleLogout} className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors">Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSettingsPage;
