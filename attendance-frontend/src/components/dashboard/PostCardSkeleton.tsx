import React from "react";

const Bar: React.FC<{ w: string }> = ({ w }) => (
  <div className={`h-3 rounded-full bg-slate-200 dark:bg-gray-700 animate-pulse ${w}`} />
);

const PostCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
    {/* Header row */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <Bar w="w-32" />
        <Bar w="w-20" />
      </div>
    </div>

    {/* Content lines */}
    <div className="space-y-2 mb-4">
      <Bar w="w-full" />
      <Bar w="w-5/6" />
      <Bar w="w-3/4" />
    </div>

    {/* Image placeholder */}
    <div className="h-44 rounded-xl bg-slate-200 dark:bg-gray-700 animate-pulse" />
  </div>
);

export default PostCardSkeleton;
