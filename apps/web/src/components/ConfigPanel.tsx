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
      <label className="mb-1 text-sm font-medium text-gray-700">Account</label>
      <select
        className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select an account...</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.name || acc.type} ({acc.credentials?.username || '***'})
          </option>
        ))}
      </select>
      <div className="mt-1 text-xs text-right">
        <button 
          type="button"
          className="text-blue-600 hover:underline"
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
    <div className="flex flex-wrap gap-2 mt-2">
      {variables.map((v) => (
        <button
          key={v}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
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
      <label className="mb-1 text-sm font-medium text-gray-700">Filter Rules</label>
      <div className="space-y-2">
        {rules.map((rule, index) => (
          <div key={index} className="flex gap-2 items-center">
            <select
              className="w-1/3 px-2 py-1 border rounded text-sm"
              value={rule.field}
              onChange={(e) => updateRule(index, 'field', e.target.value)}
            >
              <option value="subject">Subject</option>
              <option value="from">From</option>
            </select>
            <select
              className="w-1/3 px-2 py-1 border rounded text-sm"
              value={rule.operator}
              onChange={(e) => updateRule(index, 'operator', e.target.value)}
            >
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
            </select>
            <input
              className="w-1/3 px-2 py-1 border rounded text-sm"
              value={rule.value}
              onChange={(e) => updateRule(index, 'value', e.target.value)}
              placeholder="Value"
            />
            <button onClick={() => removeRule(index)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        ))}
      </div>
      <button onClick={addRule} className="mt-2 text-xs text-blue-600 hover:underline">+ Add Condition</button>
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
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l p-6 overflow-y-auto z-50 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Configuration</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-6">
        {/* IMAP Trigger */}
        {nodeType === 'trigger' && (
          <>
            <h3 className="font-medium text-lg border-b pb-2">IMAP Email Trigger</h3>
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
            <h3 className="font-medium text-lg border-b pb-2">Incoming Webhook</h3>
            <div className="bg-gray-50 p-3 rounded text-sm break-all">
              <div className="font-bold mb-1">Webhook URL:</div>
              <div className="text-gray-600">https://api.atomaton.com/webhook/...</div>
            </div>
          </>
        )}

        {/* Condition Logic */}
        {nodeType === 'condition' && (
          <>
            <h3 className="font-medium text-lg border-b pb-2">Condition (If/Else)</h3>
            <div className="flex flex-col mb-4">
              <label className="mb-1 text-sm font-medium text-gray-700">Logic Type</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded shadow-sm"
                value={config.logicType || 'AND'}
                onChange={(e) => handleChange('logicType', e.target.value)}
              >
                <option value="AND">AND (All match)</option>
                <option value="OR">OR (Any match)</option>
              </select>
            </div>
            <FilterRules rules={config.conditions} onChange={(rules) => handleChange('conditions', rules)} />
          </>
        )}

        {/* Discord Action */}
        {nodeType === 'action' && (
          <>
            <h3 className="font-medium text-lg border-b pb-2">Discord Webhook</h3>
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
              <label className="mb-1 text-sm font-medium text-gray-700">Message Content</label>
              <textarea
                className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-32"
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
            <h3 className="font-medium text-lg border-b pb-2">Notion Page</h3>
            <AccountSelect value={config.accountId || ''} onChange={(val) => handleChange('accountId', val)} />
            <Input
              label="Database ID"
              value={config.databaseId || ''}
              onChange={(e) => handleChange('databaseId', e.target.value)}
            />
            <div className="flex flex-col mb-4">
              <label className="mb-1 text-sm font-medium text-gray-700">Properties (JSON)</label>
              <textarea
                className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-48 font-mono text-xs"
                value={typeof config.properties === 'string' ? config.properties : JSON.stringify(config.properties, null, 2)}
                onChange={(e) => handleChange('properties', e.target.value)}
                placeholder='{ "Name": { "title": [ { "text": { "content": "{{subject}}" } } ] } }'
              />
              <VariablePicker onSelect={(v) => handleChange('properties', (config.properties || '') + v)} />
            </div>
          </>
        )}
      </div>

      <div className="pt-4 border-t flex justify-end space-x-2 mt-auto">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Apply</Button>
      </div>
    </div>
  );
};
