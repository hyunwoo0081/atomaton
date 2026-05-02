import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Input } from '@atomaton/ui';
const NODE_TYPES = [
    { type: 'trigger', label: 'IMAP Email', description: 'Trigger when an email is received.', category: 'Trigger' },
    { type: 'trigger-webhook', label: 'Incoming Webhook', description: 'Trigger via HTTP request.', category: 'Trigger' },
    { type: 'condition', label: 'Condition (If/Else)', description: 'Branch flow based on rules.', category: 'Logic' },
    { type: 'action', label: 'Discord Webhook', description: 'Send a message to Discord.', category: 'Action' },
    { type: 'action-notion', label: 'Notion Page', description: 'Create a page in Notion.', category: 'Action' },
];
export const NodeSelectionModal = ({ isOpen, position, onClose, onSelect }) => {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    if (!isOpen)
        return null;
    const filteredNodes = NODE_TYPES.filter((node) => {
        const matchesSearch = node.label.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'All' || node.category === activeTab;
        return matchesSearch && matchesTab;
    });
    return (_jsxs("div", { className: "fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200", style: { top: position.y, left: position.x }, children: [_jsx("div", { className: "p-4 border-b border-gray-100", children: _jsx(Input, { placeholder: "Search nodes...", value: search, onChange: (e) => setSearch(e.target.value), autoFocus: true, className: "mb-0" }) }), _jsx("div", { className: "flex border-b border-gray-100", children: ['All', 'Trigger', 'Action', 'Logic'].map((tab) => (_jsx("button", { className: `flex-1 py-2 text-xs font-medium ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`, onClick: () => setActiveTab(tab), children: tab }, tab))) }), _jsxs("div", { className: "max-h-80 overflow-y-auto p-2", children: [filteredNodes.map((node) => (_jsxs("div", { className: "p-3 hover:bg-gray-50 rounded cursor-pointer transition-colors", onClick: () => onSelect(node.type), children: [_jsx("div", { className: "font-medium text-sm text-gray-900", children: node.label }), _jsx("div", { className: "text-xs text-gray-500", children: node.description })] }, node.label))), filteredNodes.length === 0 && (_jsx("div", { className: "p-4 text-center text-sm text-gray-500", children: "No nodes found." }))] }), _jsx("div", { className: "fixed inset-0 -z-10", onClick: onClose })] }));
};
