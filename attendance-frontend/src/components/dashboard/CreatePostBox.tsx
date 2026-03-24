import React from "react";
import { Image, Paperclip } from "lucide-react";
import { EmployeeInfo } from "../../types/dashboard";

interface Props {
  employee: EmployeeInfo | null;
  onOpen: () => void;
}

const CreatePostBox: React.FC<Props> = ({ employee, onOpen }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {employee?.name.charAt(0)}
        </div>
        <button
          onClick={onOpen}
          className="flex-1 text-left px-4 py-2.5 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-400 dark:text-gray-400 text-sm rounded-full transition-colors"
        >
          Share your accomplishment, {employee?.name.split(" ")[0]}...
        </button>
      </div>
      <div className="border-t border-slate-100 dark:border-gray-700 pt-3 flex items-center justify-around">
        <button
          onClick={onOpen}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 text-sm font-semibold transition-colors"
        >
          <Image className="w-4 h-4 text-green-500" />
          Photo
        </button>
        <button
          onClick={onOpen}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 text-sm font-semibold transition-colors"
        >
          <Paperclip className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          File
        </button>
      </div>
    </div>
  );
};

export default CreatePostBox;
