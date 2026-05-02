import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Handle, Position } from 'reactflow';
import { BaseNode } from './BaseNode';
export const ActionNode = ({ id, data, selected }) => {
    return (_jsxs(BaseNode, { id: id, label: data.label, isValid: data.isValid, selected: selected, children: [_jsx(Handle, { type: "target", position: Position.Top, className: "w-3 h-3 bg-gray-400" }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: data.subLabel || 'Action' }), _jsx(Handle, { type: "source", position: Position.Bottom, className: "w-3 h-3 bg-blue-500" })] }));
};
