import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useWorkflowStore } from '../../store/workflowStore';
export const BaseNode = ({ id, label, icon, isValid, selected, children }) => {
    const deleteNode = useWorkflowStore((state) => state.deleteNode);
    const handleDelete = (e) => {
        e.stopPropagation();
        deleteNode(id);
    };
    return (_jsxs("div", { className: `
        relative px-4 py-3 min-w-[180px] group transition-all duration-200
        rounded-2xl backdrop-blur-xl shadow-lg
        ${selected
            ? 'bg-white/10 border-2 border-[#8A3FFC] shadow-[0_0_20px_rgba(138,63,252,0.3)]'
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'}
      `, children: [_jsx("button", { className: "absolute -top-2 -right-2 w-6 h-6 bg-[#FF2E63] text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110 z-10", onClick: handleDelete, title: "Delete Node", children: "\u2715" }), _jsxs("div", { className: "flex items-center mb-2", children: [icon && _jsx("div", { className: "mr-2 text-[#8A3FFC]", children: icon }), _jsx("div", { className: "text-sm font-bold text-white truncate max-w-[120px]", children: label }), _jsx("div", { className: "ml-auto pl-2", children: isValid ? (_jsx("span", { className: "text-[#00F5A0] text-xs", children: "\u25CF" })) : (_jsx("span", { className: "text-[#FF2E63] text-xs", children: "\u25CF" })) })] }), _jsx("div", { className: "text-white/60 text-xs", children: children })] }));
};
