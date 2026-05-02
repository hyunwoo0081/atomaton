import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Input } from '@atomaton/ui';
import { api } from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';
export const AccountConnectionModal = ({ isOpen, onClose }) => {
    const [type, setType] = useState('NAVER_IMAP');
    const [name, setName] = useState('');
    const [config, setConfig] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();
    if (!isOpen)
        return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Ensure config matches the selected type
            let payloadConfig;
            if (type === 'NAVER_IMAP') {
                payloadConfig = config;
            }
            else if (type === 'NOTION') {
                payloadConfig = config;
            }
            else {
                throw new Error('Unknown account type');
            }
            await api.post('/accounts', { type, name, config: payloadConfig });
            await queryClient.invalidateQueries({ queryKey: ['accounts'] });
            onClose();
            // Reset form
            setName('');
            setConfig({});
        }
        catch (error) {
            console.error('Failed to connect account:', error);
            alert('Failed to connect account');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleConfigChange = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm", children: _jsxs("div", { className: "bg-[#0D0E12]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-[500px] max-h-[90vh] flex flex-col text-white", children: [_jsxs("div", { className: "p-6 border-b border-white/10 flex justify-between items-center", children: [_jsx("h3", { className: "text-xl font-bold", children: "Connect New Account" }), _jsx("button", { onClick: onClose, className: "text-white/50 hover:text-white transition-colors", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-8 flex-1 overflow-y-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-white/80 mb-2", children: "Account Type" }), _jsxs("select", { className: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] focus:border-transparent transition-all duration-200", value: type, onChange: (e) => setType(e.target.value), children: [_jsx("option", { value: "NAVER_IMAP", className: "bg-[#0D0E12]", children: "Naver Mail (IMAP)" }), _jsx("option", { value: "NOTION", className: "bg-[#0D0E12]", children: "Notion" })] })] }), _jsx(Input, { label: "Account Name (Alias)", placeholder: "e.g. My Personal Email", value: name, onChange: (e) => setName(e.target.value), required: true }), type === 'NAVER_IMAP' && (_jsxs(_Fragment, { children: [_jsx(Input, { label: "Email Address", type: "email", placeholder: "user@naver.com", value: config.username || '', onChange: (e) => handleConfigChange('username', e.target.value), required: true }), _jsx(Input, { label: "Password", type: "password", placeholder: "Naver Password", value: config.password || '', onChange: (e) => handleConfigChange('password', e.target.value), required: true }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "IMAP Host", value: config.host || 'imap.naver.com', onChange: (e) => handleConfigChange('host', e.target.value) }), _jsx(Input, { label: "IMAP Port", type: "number", value: config.port || '993', onChange: (e) => handleConfigChange('port', parseInt(e.target.value)) })] })] })), type === 'NOTION' && (_jsxs(_Fragment, { children: [_jsx(Input, { label: "Integration Token", type: "password", placeholder: "secret_...", value: config.token || '', onChange: (e) => handleConfigChange('token', e.target.value), required: true }), _jsxs("p", { className: "text-xs text-white/50 mt-1", children: ["Create an integration at ", _jsx("a", { href: "https://www.notion.so/my-integrations", target: "_blank", rel: "noreferrer", className: "text-[#8A3FFC] hover:text-[#E02DFF] hover:underline transition-colors", children: "Notion Developers" }), "."] })] })), _jsxs("div", { className: "mt-8 flex justify-end space-x-3", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Connecting...' : 'Connect Account' })] })] })] }) }));
};
