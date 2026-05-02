import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Handle, Position } from 'reactflow';
import { BaseNode } from './BaseNode';
export const ConditionNode = ({ id, data, selected }) => {
    return (_jsxs(BaseNode, { id: id, label: data.label || 'Condition', isValid: data.isValid, selected: selected, children: [_jsx(Handle, { type: "target", position: Position.Top, className: "w-3 h-3 bg-gray-400" }), _jsxs("div", { className: "flex justify-between mt-2 text-xs font-bold", children: [_jsx("div", { className: "text-green-600", children: "True" }), _jsx("div", { className: "text-red-600", children: "False" })] }), _jsx(Handle, { type: "source", position: Position.Bottom, id: "true", className: "w-3 h-3 bg-green-500 !left-[30%]" }), _jsx(Handle, { type: "source", position: Position.Bottom, id: "false", className: "w-3 h-3 bg-red-500 !left-[70%]" })] }));
};
