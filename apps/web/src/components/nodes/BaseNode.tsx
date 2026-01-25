import React from 'react';
import { Handle, Position } from 'reactflow';
import { useWorkflowStore } from '../../store/workflowStore';

interface BaseNodeProps {
  id: string; // Added id prop
  label: string;
  icon?: React.ReactNode;
  isValid?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ id, label, icon, isValid, selected, children }) => {
  const deleteNode = useWorkflowStore((state) => state.deleteNode);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    deleteNode(id);
  };

  return (
    <div
      className={`relative px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[150px] group ${
        selected ? 'border-blue-500' : 'border-gray-200'
      }`}
    >
      {/* Delete Button (Visible on hover or selected) */}
      <button
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10"
        onClick={handleDelete}
        title="Delete Node"
      >
        ✕
      </button>

      <div className="flex items-center">
        {icon && <div className="mr-2">{icon}</div>}
        <div className="text-sm font-bold text-gray-900">{label}</div>
        <div className="ml-auto pl-2">
          {isValid ? (
            <span className="text-green-500">✅</span>
          ) : (
            <span className="text-yellow-500">⚠️</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};
