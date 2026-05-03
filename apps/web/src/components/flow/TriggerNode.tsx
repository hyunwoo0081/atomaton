import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const TriggerNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[150px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 mr-2">
          ⚡
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">{data.label}</div>
          <div className="text-xs text-gray-500">{data.type || 'Select type'}</div>
        </div>
      </div>
      
      {/* Trigger는 출력만 있음 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  );
};

export default memo(TriggerNode);
