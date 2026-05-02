import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@atomaton/ui';
export const TestRunModal = ({ isOpen, onClose, onRun }) => {
    const [inputData, setInputData] = useState(JSON.stringify({
        subject: "Test Email Subject",
        from: "test@example.com",
        body: "This is a test email body."
    }, null, 2));
    const [result, setResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    if (!isOpen)
        return null;
    const handleRun = async () => {
        setIsRunning(true);
        setResult(null);
        try {
            const parsedData = JSON.parse(inputData);
            const res = await onRun(parsedData);
            setResult(res);
        }
        catch (error) {
            let errorMessage = 'Execution Failed';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'string') {
                errorMessage = error;
            }
            setResult({ error: errorMessage });
        }
        finally {
            setIsRunning(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm", children: _jsxs("div", { className: "bg-[#0D0E12]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "p-6 border-b border-white/10 flex justify-between items-center", children: [_jsx("h3", { className: "text-xl font-bold text-white", children: "Test Workflow" }), _jsx("button", { onClick: onClose, className: "text-white/50 hover:text-white transition-colors", children: "\u2715" })] }), _jsxs("div", { className: "p-6 flex-1 overflow-y-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-white/80 mb-2", children: "Input Data (Trigger Payload)" }), _jsx("textarea", { className: "w-full h-40 p-4 bg-white/5 border border-white/10 rounded-xl font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] transition-all", value: inputData, onChange: (e) => setInputData(e.target.value) })] }), result && (_jsxs("div", { className: "mb-4 animate-fade-in", children: [_jsx("label", { className: "block text-sm font-medium text-white/80 mb-2", children: "Execution Result" }), _jsx("div", { className: `p-4 rounded-xl border text-sm font-mono whitespace-pre-wrap overflow-auto max-h-60 ${result.error ? 'bg-[#FF2E63]/10 border-[#FF2E63]/30 text-[#FF2E63]' : 'bg-[#00F5A0]/10 border-[#00F5A0]/30 text-[#00F5A0]'}`, children: JSON.stringify(result, null, 2) })] }))] }), _jsxs("div", { className: "p-6 border-t border-white/10 flex justify-end space-x-3", children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" }), _jsx(Button, { onClick: handleRun, disabled: isRunning, children: isRunning ? 'Running...' : 'Run Test' })] })] }) }));
};
