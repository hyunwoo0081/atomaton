import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';

export const TriggerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  return (
    <BaseNode id={id} label={data.label} isValid={data.isValid} selected={selected}>
      <div className="text-xs text-gray-500 mt-1">{data.subLabel || 'Trigger'}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </BaseNode>
  );
};
