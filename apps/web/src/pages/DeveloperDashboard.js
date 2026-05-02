import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '@atomaton/ui';
import { api } from '../utils/api';
import { useQuery } from '@tanstack/react-query';
export const DeveloperDashboard = () => {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['systemStats'],
        queryFn: () => api.get('/admin/stats'),
    });
    if (isLoading) {
        return _jsx("div", { className: "p-8", children: "Loading stats..." });
    }
    if (error || !stats) {
        return _jsx("div", { className: "p-8", children: "Failed to load stats." });
    }
    return (_jsxs("div", { className: "p-8 max-w-7xl mx-auto space-y-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Developer Dashboard" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsxs(Card, { children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Total Users" }), _jsx("div", { className: "mt-2 text-3xl font-semibold text-gray-900", children: stats.overview.totalUsers })] }), _jsxs(Card, { children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Total Workflows" }), _jsx("div", { className: "mt-2 text-3xl font-semibold text-gray-900", children: stats.overview.totalWorkflows })] }), _jsxs(Card, { children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Active Workflows" }), _jsx("div", { className: "mt-2 text-3xl font-semibold text-gray-900", children: stats.overview.activeWorkflows })] }), _jsxs(Card, { children: [_jsx("div", { className: "text-sm font-medium text-gray-500", children: "Success Rate" }), _jsx("div", { className: "mt-2 text-3xl font-semibold text-green-600", children: stats.overview.successRate })] })] }), _jsxs("section", { children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 mb-4", children: "Top Failing Workflows" }), _jsx("div", { className: "bg-white shadow overflow-hidden sm:rounded-md", children: _jsxs("ul", { className: "divide-y divide-gray-200", children: [stats.problematicWorkflows.map((workflow) => (_jsx("li", { children: _jsxs("div", { className: "px-4 py-4 sm:px-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium text-indigo-600 truncate", children: workflow.name }), _jsx("div", { className: "ml-2 flex-shrink-0 flex", children: _jsxs("p", { className: "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800", children: [workflow.failureCount, " Failures"] }) })] }), _jsx("div", { className: "mt-2 sm:flex sm:justify-between", children: _jsx("div", { className: "sm:flex", children: _jsxs("p", { className: "flex items-center text-sm text-gray-500", children: ["ID: ", workflow.id] }) }) })] }) }, workflow.id))), stats.problematicWorkflows.length === 0 && (_jsx("li", { className: "px-4 py-4 sm:px-6 text-center text-gray-500", children: "No problematic workflows found." }))] }) })] })] }));
};
