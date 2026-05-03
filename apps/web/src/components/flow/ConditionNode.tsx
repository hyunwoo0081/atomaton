import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ConditionNode = ({ data, selected }: NodeProps) => {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[150px] ${
        selected ? 'border-orange-500' : 'border-gray-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400"
      />
      
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-600 mr-2">
          ❓
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">Condition</div>
          <div className="text-xs text-gray-500">
            {data.condition ? `${data.condition.field} ${data.condition.operator}` : 'Configure rule'}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
};

export default memo(ConditionNode);
