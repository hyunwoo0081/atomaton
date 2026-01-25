import React, { useState, useEffect } from 'react';
import { Button, Input } from '@atomaton/ui';
import { api } from '../utils/api';
import { useQuery } from '@tanstack/react-query';
import { AccountConnectionModal } from './AccountConnectionModal';

interface ConfigPanelProps {
  nodeId: string;
  nodeType: string;
  initialConfig: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

// --- Sub-components for specific settings ---

const AccountSelect: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<any[]>('/accounts'),
  });

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-2 text-sm font-medium text-white/80">Account</label>
      <select
        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] focus:border-transparent transition-all duration-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" className="bg-[#0D0E12]">Select an account...</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id} className="bg-[#0D0E12]">
            {acc.name || acc.type} ({acc.credentials?.username || '***'})
          </option>
        ))}
      </select>
      <div className="mt-2 text-xs text-right">
        <button 
          type="button"
          className="text-[#8A3FFC] hover:text-[#E02DFF] hover:underline transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          + Connect New Account
        </button>
      </div>
      <AccountConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

const VariablePicker: React.FC<{ onSelect: (variable: string) => void }> = ({ onSelect }) => {
  const variables = ['{{subject}}', '{{from}}', '{{date}}', '{{body}}'];
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {variables.map((v) => (
        <button
          key={v}
          className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-full border border-white/10 text-white/80 transition-all"
          onClick={() => onSelect(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
};

const FilterRules: React.FC<{ rules: any[]; onChange: (rules: any[]) => void }> = ({ rules = [], onChange }) => {
  const addRule = () => {
    onChange([...rules, { field: 'subject', operator: 'contains', value: '' }]);
  };

  const updateRule = (index: number, key: string, val: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [key]: val };
    onChange(newRules);
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-4">
      <label className="mb-2 text-sm font-medium text-white/80">Filter Rules</label>
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="flex gap-2 items-center">
            <select
              className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
              value={rule.field}
              onChange={(e) => updateRule(index, 'field', e.target.value)}
            >
              <option value="subject" className="bg-[#0D0E12]">Subject</option>
              <option value="from" className="bg-[#0D0E12]">From</option>
            </select>
            <select
              className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
              value={rule.operator}
              onChange={(e) => updateRule(index, 'operator', e.target.value)}
            >
              <option value="contains" className="bg-[#0D0E12]">Contains</option>
              <option value="equals" className="bg-[#0D0E12]">Equals</option>
            </select>
            <input
              className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
              value={rule.value}
              onChange={(e) => updateRule(index, 'value', e.target.value)}
              placeholder="Value"
            />
            <button onClick={() => removeRule(index)} className="text-[#FF2E63] hover:text-red-400 transition-colors">×</button>
          </div>
        ))}
      </div>
      <button onClick={addRule} className="mt-3 text-xs text-[#8A3FFC] hover:text-[#E02DFF] hover:underline transition-colors">+ Add Condition</button>
    </div>
  );
};

// --- Main Component ---

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ nodeId, nodeType, initialConfig, onSave, onClose }) => {
  const [config, setConfig] = useState<any>(initialConfig || {});

  useEffect(() => {
    setConfig(initialConfig || {});
  }, [initialConfig, nodeId]); // Reset when node changes

  const handleChange = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white/5 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto z-50 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-white">Configuration</h2>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-8">
        {/* IMAP Trigger */}
        {nodeType === 'trigger' && (
          <>
            <h3 className="font-bold text-lg text-[#8A3FFC] border-b border-white/10 pb-2">IMAP Email Trigger</h3>
            <AccountSelect value={config.accountId || ''} onChange={(val) => handleChange('accountId', val)} />
            <Input
              label="Mailbox"
              value={config.mailbox || 'INBOX'}
              onChange={(e) => handleChange('mailbox', e.target.value)}
            />
            <Input
              label="Polling Interval (min)"
              type="number"
              value={config.interval || 30}
              onChange={(e) => handleChange('interval', parseInt(e.target.value))}
            />
            <FilterRules rules={config.rules} onChange={(rules) => handleChange('rules', rules)} />
          </>
        )}

        {/* Webhook Trigger */}
        {nodeType === 'trigger-webhook' && (
          <>
            <h3 className="font-bold text-lg text-[#8A3FFC] border-b border-white/10 pb-2">Incoming Webhook</h3>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm break-all">
              <div className="font-bold mb-2 text-white/80">Webhook URL:</div>
              <div className="text-[#00F5A0] font-mono">https://api.atomaton.com/webhook/...</div>
            </div>
          </>
        )}

        {/* Condition Logic */}
        {nodeType === 'condition' && (
          <>
            <h3 className="font-bold text-lg text-[#E02DFF] border-b border-white/10 pb-2">Condition (If/Else)</h3>
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-sm font-medium text-white/80">Logic Type</label>
              <select
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E02DFF] focus:border-transparent"
                value={config.logicType || 'AND'}
                onChange={(e) => handleChange('logicType', e.target.value)}
              >
                <option value="AND" className="bg-[#0D0E12]">AND (All match)</option>
                <option value="OR" className="bg-[#0D0E12]">OR (Any match)</option>
              </select>
            </div>
            <FilterRules rules={config.conditions} onChange={(rules) => handleChange('conditions', rules)} />
          </>
        )}

        {/* Discord Action */}
        {nodeType === 'action' && (
          <>
            <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">Discord Webhook</h3>
            <Input
              label="Webhook URL"
              value={config.webhookUrl || ''}
              onChange={(e) => handleChange('webhookUrl', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <Input
              label="Bot Name (Optional)"
              value={config.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
            />
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-sm font-medium text-white/80">Message Content</label>
              <textarea
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-32 transition-all duration-200"
                value={config.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Hello {{subject}}!"
              />
              <VariablePicker onSelect={(v) => handleChange('content', (config.content || '') + v)} />
            </div>
          </>
        )}

        {/* Notion Action */}
        {nodeType === 'action-notion' && (
          <>
            <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">Notion Page</h3>
            <AccountSelect value={config.accountId || ''} onChange={(val) => handleChange('accountId', val)} />
            <Input
              label="Database ID"
              value={config.databaseId || ''}
              onChange={(e) => handleChange('databaseId', e.target.value)}
            />
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-sm font-medium text-white/80">Properties (JSON)</label>
              <textarea
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-48 font-mono text-xs transition-all duration-200"
                value={typeof config.properties === 'string' ? config.properties : JSON.stringify(config.properties, null, 2)}
                onChange={(e) => handleChange('properties', e.target.value)}
                placeholder='{ "Name": { "title": [ { "text": { "content": "{{subject}}" } } ] } }'
              />
              <VariablePicker onSelect={(v) => handleChange('properties', (config.properties || '') + v)} />
            </div>
          </>
        )}
      </div>

      <div className="pt-6 border-t border-white/10 flex justify-end space-x-3 mt-auto">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Apply</Button>
      </div>
    </div>
  );
};
