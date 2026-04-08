export interface EmployeeInfo {
  id: number;
  badge: string;
  name: string;
  department: string;
  dept_id?: number | null;
  avatar_url?: string | null;
  role?: string | null;
}

export type DateFilter = "all" | "today" | "week" | "month" | "custom";

export interface PostFile {
  id: number;
  post_id: number;
  file_url: string;
  file_type: "image" | "video" | "document" | "other";
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export interface AccomplishmentPost {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  files: PostFile[];
}

export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
