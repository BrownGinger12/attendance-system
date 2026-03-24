import React from "react";
import { MoreHorizontal, FileText, X } from "lucide-react";
import { AccomplishmentPost, EmployeeInfo, formatRelativeTime } from "../../types/dashboard";

const API_URL = import.meta.env.VITE_API_URL;

interface Props {
  post: AccomplishmentPost;
  employee: EmployeeInfo;
  openMenuPostId: number | null;
  onMenuToggle: (id: number | null) => void;
  onEdit: (post: AccomplishmentPost) => void;
  onDelete: (id: number) => void;
}

const PostCard: React.FC<Props> = ({ post, employee, openMenuPostId, onMenuToggle, onEdit, onDelete }) => {
  const images = post.files.filter((f) => f.file_type === "image");
  const otherFiles = post.files.filter((f) => f.file_type !== "image");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {employee.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{employee.name}</p>
            <p className="text-xs text-slate-400 dark:text-gray-500">{formatRelativeTime(post.created_at)}</p>
          </div>
        </div>

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => onMenuToggle(openMenuPostId === post.id ? null : post.id)}
            className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {openMenuPostId === post.id && (
            <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-slate-100 dark:border-gray-600 py-1 w-36">
              <button
                onClick={() => { onMenuToggle(null); onEdit(post); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-slate-400 dark:text-gray-400" /> Edit
              </button>
              <button
                onClick={() => onDelete(post.id)}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="px-4 pb-3 text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Files */}
      {post.files.length > 0 && (
        <div className="px-4 pb-3">
          {images.length > 0 && (
            <div className={`grid gap-1 rounded-xl overflow-hidden mb-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {images.map((f) => (
                <a key={f.id} href={`${API_URL}${f.file_url}`} target="_blank" rel="noreferrer">
                  <img
                    src={`${API_URL}${f.file_url}`}
                    alt={f.file_name ?? "image"}
                    className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          )}
          {otherFiles.map((f) => (
            <a
              key={f.id}
              href={`${API_URL}${f.file_url}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors mb-1"
            >
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-slate-700 dark:text-gray-200 font-medium truncate">{f.file_name ?? "File"}</p>
                {f.file_size && (
                  <p className="text-xs text-slate-400 dark:text-gray-500">{(f.file_size / 1024).toFixed(1)} KB</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Edited indicator */}
      {post.updated_at !== post.created_at && (
        <p className="px-4 pb-2 text-xs text-slate-400 dark:text-gray-500 italic">
          Edited {formatRelativeTime(post.updated_at)}
        </p>
      )}
    </div>
  );
};

export default PostCard;
