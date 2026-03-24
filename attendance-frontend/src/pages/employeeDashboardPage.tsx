import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CalendarDays } from "lucide-react";

import { EmployeeInfo, AccomplishmentPost, DateFilter } from "../types/dashboard";
import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";
import PostCardSkeleton from "../components/dashboard/PostCardSkeleton";
import ProfileHeader from "../components/dashboard/ProfileHeader";
import CreatePostBox from "../components/dashboard/CreatePostBox";
import FilterBar from "../components/dashboard/FilterBar";
import PostCard from "../components/dashboard/PostCard";
import PostModal from "../components/dashboard/PostModal";
import DeleteConfirmModal from "../components/dashboard/DeleteConfirmModal";
import AttendanceModal from "../components/dashboard/AttendanceModal";
import LogoutModal from "../components/dashboard/LogoutModal";

const API_URL = import.meta.env.VITE_API_URL;

const EmployeeDashboardPage: React.FC = () => {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"checkin" | "checkout" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  // Posts
  const [posts, setPosts] = useState<AccomplishmentPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<AccomplishmentPost | null>(null);
  const [postContent, setPostContent] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string | null }[]>([]);
  const [openMenuPostId, setOpenMenuPostId] = useState<number | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  // ── Modal animation effects ───────────────────────────────────────────────
  useEffect(() => {
    if (showAttendanceModal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
    } else {
      setModalVisible(false);
      setAttendanceSuccess(false);
      setSuccessVisible(false);
    }
  }, [showAttendanceModal]);

  useEffect(() => {
    if (showLogoutModal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setLogoutModalVisible(true)));
    } else {
      setLogoutModalVisible(false);
    }
  }, [showLogoutModal]);

  useEffect(() => {
    if (showPostModal) {
      requestAnimationFrame(() => requestAnimationFrame(() => setPostModalVisible(true)));
    } else {
      setPostModalVisible(false);
    }
  }, [showPostModal]);

  useEffect(() => {
    if (showDeleteConfirm !== null) {
      requestAnimationFrame(() => requestAnimationFrame(() => setDeleteConfirmVisible(true)));
    } else {
      setDeleteConfirmVisible(false);
    }
  }, [showDeleteConfirm]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchPosts = async (employeeId: number) => {
    try {
      setPostsLoading(true);
      const res = await fetch(`${API_URL}/accomplishments/user/${employeeId}?limit=50`);
      const data = await res.json();
      if (data.statusCode === 200) setPosts(data.data);
    } catch { /* silent */ } finally {
      setPostsLoading(false);
    }
  };

  const fetchAttendanceStatus = async (employeeId: number) => {
    try {
      const res = await fetch(`${API_URL}/attendance/employee?user_id=${employeeId}&day=${today}`);
      const data = await res.json();
      if (data.statusCode === 200 && data.data.length > 0) {
        setCheckedIn(data.data[0].checktype === "I");
      } else {
        setCheckedIn(false);
      }
    } catch {
      setCheckedIn(false);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    const stored = localStorage.getItem("employeeData");
    if (!token || !stored) {
      navigate("/employee-login", { replace: true });
      return;
    }
    const emp: EmployeeInfo = JSON.parse(stored);
    setEmployee(emp);
    setLoading(false);
    fetchAttendanceStatus(emp.id);
    fetchPosts(emp.id);
    // Fetch avatar_url from profile
    fetch(`${API_URL}/employee/profile`, { headers: { "x-access-token": token } })
      .then((r) => r.json())
      .then((data) => {
        if (data.statusCode === 200 && data.avatar_url) {
          const updated = { ...emp, avatar_url: data.avatar_url };
          setEmployee(updated);
          localStorage.setItem("employeeData", JSON.stringify(updated));
        }
      })
      .catch(() => {});
  }, [navigate]);

  // ── Post modal ────────────────────────────────────────────────────────────
  const openPostModal = (post?: AccomplishmentPost) => {
    setEditingPost(post ?? null);
    setPostContent(post?.content ?? "");
    setSelectedFiles([]);
    setPostError(null);
    setShowPostModal(true);
  };

  const closePostModal = () => {
    setShowPostModal(false);
    setEditingPost(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newEntries = Array.from(e.target.files!).map((f) => ({
        file: f,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      }));
      setSelectedFiles((prev) => [...prev, ...newEntries]);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const entry = prev[index];
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submitPost = async () => {
    if (!employee) return;
    const token = localStorage.getItem("employeeToken");
    if (!token) return;
    setPostSubmitting(true);
    setPostError(null);
    try {
      if (editingPost) {
        const res = await fetch(`${API_URL}/accomplishments/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-access-token": token },
          body: JSON.stringify({ content: postContent }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update");
        if (selectedFiles.length > 0) {
          const fd = new FormData();
          selectedFiles.forEach(({ file }) => fd.append("files", file));
          await fetch(`${API_URL}/accomplishments/${editingPost.id}/files`, {
            method: "POST",
            headers: { "x-access-token": token },
            body: fd,
          });
        }
      } else {
        const fd = new FormData();
        fd.append("content", postContent);
        selectedFiles.forEach(({ file }) => fd.append("files", file));
        const res = await fetch(`${API_URL}/accomplishments`, {
          method: "POST",
          headers: { "x-access-token": token },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create");
      }
      await fetchPosts(employee.id);
      closePostModal();
    } catch (err: any) {
      setPostError(err.message);
    } finally {
      setPostSubmitting(false);
    }
  };

  // ── Delete post ───────────────────────────────────────────────────────────
  const openDeleteConfirm = (postId: number) => {
    setOpenMenuPostId(null);
    setShowDeleteConfirm(postId);
  };

  const deletePost = async () => {
    if (!showDeleteConfirm || !employee) return;
    const token = localStorage.getItem("employeeToken");
    if (!token) return;
    setDeletingPost(true);
    try {
      const res = await fetch(`${API_URL}/accomplishments/${showDeleteConfirm}`, {
        method: "DELETE",
        headers: { "x-access-token": token },
      });
      if (res.ok) {
        setShowDeleteConfirm(null);
        await fetchPosts(employee.id);
      }
    } catch { /* silent */ } finally {
      setDeletingPost(false);
    }
  };

  const deleteFile = async (postId: number, fileId: number) => {
    const token = localStorage.getItem("employeeToken");
    if (!token || !employee) return;
    await fetch(`${API_URL}/accomplishments/${postId}/files/${fileId}`, {
      method: "DELETE",
      headers: { "x-access-token": token },
    });
    await fetchPosts(employee.id);
  };

  // ── Attendance ────────────────────────────────────────────────────────────
  const openAttendanceModal = () => {
    setErrorMessage(null);
    setAttendanceSuccess(false);
    setSuccessVisible(false);
    setShowAttendanceModal(true);
  };

  const handleAttendance = async () => {
    const token = localStorage.getItem("employeeToken");
    if (!token) return;
    const type = checkedIn ? "checkout" : "checkin";
    setActionLoading(type);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_URL}/employee/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-token": token },
      });
      const data = await res.json();
      if (!res.ok || (data.statusCode && data.statusCode !== 200))
        throw new Error(data.message || data.error || "Something went wrong");
      setCheckedIn(type === "checkin");
      setAttendanceSuccess(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSuccessVisible(true)));
      setTimeout(() => setShowAttendanceModal(false), 1800);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employeeData");
    navigate("/employee-login", { replace: true });
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredPosts = posts.filter((post) => {
    const d = new Date(post.created_at);
    const n = new Date();
    if (dateFilter === "all") return true;
    if (dateFilter === "today") return d.toDateString() === n.toDateString();
    if (dateFilter === "week") return d >= new Date(n.getTime() - 7 * 86400000);
    if (dateFilter === "month") return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    if (dateFilter === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      return d >= from && d <= to;
    }
    return true;
  });

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
        onLogout={() => setShowLogoutModal(true)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuOpen={() => setSidebarOpen(true)}
          statusLoading={statusLoading}
          checkedIn={checkedIn}
          onAttendanceClick={openAttendanceModal}
        />

        <div className="flex-1 overflow-y-auto animate-fade-in-up">
          <ProfileHeader employee={employee} />

          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
            <div className="space-y-3">

              <CreatePostBox employee={employee} onOpen={() => openPostModal()} />

              <FilterBar
                dateFilter={dateFilter}
                customFrom={customFrom}
                customTo={customTo}
                today={today}
                onFilterChange={setDateFilter}
                onCustomFromChange={setCustomFrom}
                onCustomToChange={setCustomTo}
              />

              {postsLoading ? (
                <div className="space-y-3">
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
                  <CalendarDays className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-gray-500">
                    {posts.length === 0 ? "No accomplishments posted yet." : "No posts found for the selected date range."}
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    employee={employee!}
                    openMenuPostId={openMenuPostId}
                    onMenuToggle={setOpenMenuPostId}
                    onEdit={openPostModal}
                    onDelete={openDeleteConfirm}
                  />
                ))
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PostModal
        show={showPostModal}
        visible={postModalVisible}
        employee={employee}
        editingPost={editingPost}
        postContent={postContent}
        selectedFiles={selectedFiles}
        postSubmitting={postSubmitting}
        postError={postError}
        fileInputRef={fileInputRef}
        onClose={closePostModal}
        onContentChange={setPostContent}
        onSubmit={submitPost}
        onFileChange={handleFileChange}
        onRemoveFile={removeFile}
        onDeleteFile={deleteFile}
      />

      <DeleteConfirmModal
        show={showDeleteConfirm !== null}
        visible={deleteConfirmVisible}
        deleting={deletingPost}
        onCancel={() => setShowDeleteConfirm(null)}
        onConfirm={deletePost}
      />

      <AttendanceModal
        show={showAttendanceModal}
        visible={modalVisible}
        checkedIn={checkedIn}
        actionLoading={actionLoading}
        attendanceSuccess={attendanceSuccess}
        successVisible={successVisible}
        errorMessage={errorMessage}
        onClose={() => setShowAttendanceModal(false)}
        onConfirm={handleAttendance}
      />

      <LogoutModal
        show={showLogoutModal}
        visible={logoutModalVisible}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default EmployeeDashboardPage;
