import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Button, Card } from '@atomaton/ui';
import { api } from '../utils/api';
import { LogTable } from '../components/LogTable';
import { useQuery } from '@tanstack/react-query';
export const Dashboard = () => {
    const { data: workflows = [], isLoading: isLoadingWorkflows } = useQuery({
        queryKey: ['workflows'],
        queryFn: () => api.get('/workflows'),
    });
    const { data: logsData, isLoading: isLoadingLogs } = useQuery({
        queryKey: ['logs'],
        queryFn: () => api.get('/logs?limit=10'),
    });
    const logs = logsData?.logs || [];
    const isLoading = isLoadingWorkflows || isLoadingLogs;
    const createWorkflow = async () => {
        const name = prompt('Enter workflow name:');
        if (!name)
            return;
        try {
            await api.post('/workflows', { name });
            window.location.reload();
        }
        catch (error) {
            console.error('Failed to create workflow:', error);
            alert('Failed to create workflow');
        }
    };
    if (isLoading) {
        return _jsx("div", { className: "p-8 text-white", children: "Loading..." });
    }
    return (_jsxs("div", { className: "space-y-12", children: [_jsxs("section", { children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-white", children: "Workflows" }), _jsx(Button, { onClick: createWorkflow, children: "+ New Workflow" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [workflows.map((workflow) => (_jsx(Link, { to: `/workflow/${workflow.id}`, className: "block group", children: _jsx(Card, { className: "h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(138,63,252,0.2)]", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-white mb-2", children: workflow.name }), _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${workflow.is_active
                                                            ? 'bg-[#00F5A0]/20 text-[#00F5A0] border-[#00F5A0]/30'
                                                            : 'bg-white/10 text-white/50 border-white/20'}`, children: workflow.is_active ? 'Active' : 'Inactive' })] }), _jsx("span", { className: "text-sm text-white/40 font-mono", children: new Date(workflow.created_at).toLocaleDateString() })] }) }) }, workflow.id))), workflows.length === 0 && (_jsx("div", { className: "col-span-full text-center py-12 text-white/50 border border-dashed border-white/10 rounded-3xl", children: "No workflows found. Create your first one!" }))] })] }), _jsxs("section", { children: [_jsx("h2", { className: "text-2xl font-bold text-white mb-6", children: "Recent Activity" }), _jsx(LogTable, { logs: logs })] })] }));
};
