import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow'
import { BaseNode } from './BaseNode';

export const ConditionNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  return (
    <BaseNode id={id} label={data.label || 'Condition'} isValid={data.isValid} selected={selected}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      
      <div className="flex justify-between mt-2 text-xs font-bold">
        <div className="text-green-600">True</div>
        <div className="text-red-600">False</div>
      </div>

      {/* True Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 bg-green-500 !left-[30%]"
      />
      
      {/* False Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500 !left-[70%]"
      />
    </BaseNode>
  );
};
