import React from 'react';
import { useWorkflowStore } from '../../store/workflowStore'

interface BaseNodeProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isValid?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ id, label, icon, isValid, selected, children }) => {
  const deleteNode = useWorkflowStore((state) => state.deleteNode);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div
      className={`
        relative px-4 py-3 min-w-[180px] group transition-all duration-200
        rounded-2xl backdrop-blur-xl shadow-lg
        ${selected 
          ? 'bg-white/10 border-2 border-[#8A3FFC] shadow-[0_0_20px_rgba(138,63,252,0.3)]' 
          : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Delete Button */}
      <button
        className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF2E63] text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110 z-10"
        onClick={handleDelete}
        title="Delete Node"
      >
        ✕
      </button>

      <div className="flex items-center mb-2">
        {icon && <div className="mr-2 text-[#8A3FFC]">{icon}</div>}
        <div className="text-sm font-bold text-white truncate max-w-[120px]">{label}</div>
        <div className="ml-auto pl-2">
          {isValid ? (
            <span className="text-[#00F5A0] text-xs">●</span>
          ) : (
            <span className="text-[#FF2E63] text-xs">●</span>
          )}
        </div>
      </div>
      
      <div className="text-white/60 text-xs">
        {children}
      </div>
    </div>
  );
};
