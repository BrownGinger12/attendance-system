import React from "react";
import { X, Image, Paperclip, FileText, Loader2 } from "lucide-react";
import { AccomplishmentPost, EmployeeInfo } from "../../types/dashboard";

const API_URL = import.meta.env.VITE_API_URL;

interface SelectedFile {
  file: File;
  preview: string | null;
}

interface Props {
  show: boolean;
  visible: boolean;
  employee: EmployeeInfo | null;
  editingPost: AccomplishmentPost | null;
  postContent: string;
  selectedFiles: SelectedFile[];
  postSubmitting: boolean;
  postError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onContentChange: (v: string) => void;
  onSubmit: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (i: number) => void;
  onDeleteFile: (postId: number, fileId: number) => void;
}

const PostModal: React.FC<Props> = ({
  show,
  visible,
  employee,
  editingPost,
  postContent,
  selectedFiles,
  postSubmitting,
  postError,
  fileInputRef,
  onClose,
  onContentChange,
  onSubmit,
  onFileChange,
  onRemoveFile,
  onDeleteFile,
}) => {
  if (!show) return null;

  const existingImages =
    editingPost?.files.filter((f) => f.file_type === "image") ?? [];
  const existingOther =
    editingPost?.files.filter((f) => f.file_type !== "image") ?? [];
  const newImages = selectedFiles.filter((e) => e.preview);
  const newOther = selectedFiles.filter((e) => !e.preview);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-lg flex flex-col transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700">
          <div className="w-8" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            {editingPost ? "Edit accomplishment" : "Add accomplishment"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
              {employee?.avatar_url
                ? <img src={`${API_URL}${employee.avatar_url}`} alt={employee.name} className="w-full h-full object-cover" />
                : employee?.name.charAt(0)}
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">
              {employee?.name}
            </span>
          </div>

          {/* Textarea */}
          <textarea
            value={postContent}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={`What's on your mind, ${employee?.name.split(" ")[0]}?`}
            rows={4}
            className="w-full resize-none text-slate-700 dark:text-gray-200 text-sm placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none leading-relaxed bg-transparent"
          />

          {/* Existing files (edit mode) */}
          {editingPost && editingPost.files.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-600 bg-slate-100 dark:bg-gray-700">
              {existingImages.length > 0 && (
                <div
                  className={`grid gap-0.5 ${existingImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                >
                  {existingImages.map((f, idx, arr) => {
                    const spanFull =
                      arr.length % 2 !== 0 &&
                      idx === arr.length - 1 &&
                      arr.length > 1;
                    return (
                      <div
                        key={f.id}
                        className={`relative group bg-slate-200 dark:bg-gray-600 ${spanFull ? "col-span-2" : ""}`}
                      >
                        <img
                          src={`${API_URL}${f.file_url}`}
                          alt={f.file_name ?? ""}
                          className={`w-full object-cover ${arr.length === 1 ? "max-h-80" : "h-48"}`}
                        />
                        <button
                          onClick={() => onDeleteFile(editingPost.id, f.id)}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {existingOther.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 first:border-t-0"
                >
                  <FileText className="w-7 h-7 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">
                      {f.file_name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">
                      {f.file_size
                        ? (f.file_size / 1024).toFixed(1) + " KB"
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteFile(editingPost.id, f.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New file previews */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-600 bg-slate-100 dark:bg-gray-700">
              {newImages.length > 0 && (
                <div
                  className={`relative grid gap-0.5 ${newImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                >
                  {selectedFiles
                    .map((entry, originalIndex) => ({ entry, originalIndex }))
                    .filter(({ entry }) => entry.preview)
                    .map(({ entry, originalIndex }, gridIdx, arr) => {
                      const spanFull =
                        arr.length % 2 !== 0 &&
                        gridIdx === arr.length - 1 &&
                        arr.length > 1;
                      return (
                        <div
                          key={originalIndex}
                          className={`relative group bg-slate-200 dark:bg-gray-600 ${spanFull ? "col-span-2" : ""}`}
                        >
                          <img
                            src={entry.preview!}
                            alt={entry.file.name}
                            className={`w-full object-cover ${arr.length === 1 ? "max-h-80" : "h-48"}`}
                          />
                          <button
                            onClick={() => onRemoveFile(originalIndex)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
              {newOther.map((_, i) => {
                const entry = selectedFiles.filter((e) => !e.preview)[i];
                const originalIndex = selectedFiles.indexOf(entry);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 first:border-t-0"
                  >
                    <FileText className="w-7 h-7 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">
                        {entry.file.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">
                        {(entry.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveFile(originalIndex)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-400 dark:text-gray-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add to post bar */}
        <div className="mx-4 mb-3 border border-slate-200 dark:border-gray-600 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-600 dark:text-gray-300">
            Add to your post
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Photo / Video"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Image className="w-5 h-5 text-green-500" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Paperclip className="w-5 h-5 text-slate-400 dark:text-gray-500" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xlsx,.pptx"
          className="hidden"
          onChange={onFileChange}
        />

        {postError && (
          <p className="mx-4 mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {postError}
          </p>
        )}

        {/* Submit */}
        <div className="px-4 pb-4">
          <button
            onClick={onSubmit}
            disabled={
              postSubmitting ||
              (postContent.trim() === "" && selectedFiles.length === 0)
            }
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {postSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingPost ? "Save" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
