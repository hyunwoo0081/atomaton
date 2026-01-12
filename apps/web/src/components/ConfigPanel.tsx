import React, { useState, useEffect } from 'react';
import { Button, Input, Card } from '@atomaton/ui';

interface ConfigPanelProps {
  nodeId: string;
  nodeType: string; // 'trigger' | 'action-DISCORD_WEBHOOK' | 'action-NOTION_PAGE'
  initialConfig: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ nodeId, nodeType, initialConfig, onSave, onClose }) => {
  const [config, setConfig] = useState<any>(initialConfig || {});

  useEffect(() => {
    setConfig(initialConfig || {});
  }, [initialConfig]);

  const handleChange = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l p-6 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Configuration</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {nodeType === 'trigger' && (
          <div>
            <h3 className="font-medium mb-2">IMAP Polling Trigger</h3>
            <Input
              label="Account ID"
              value={config.accountId || ''}
              onChange={(e) => handleChange('accountId', e.target.value)}
              placeholder="Select Account ID"
            />
            {/* Add more trigger config fields here */}
          </div>
        )}

        {nodeType.includes('DISCORD_WEBHOOK') && (
          <div>
            <h3 className="font-medium mb-2">Discord Webhook Action</h3>
            <Input
              label="Webhook URL"
              value={config.webhookUrl || ''}
              onChange={(e) => handleChange('webhookUrl', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <div className="flex flex-col mb-4">
              <label className="mb-1 text-sm font-medium text-gray-700">Message Content</label>
              <textarea
                className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-32"
                value={config.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Hello {{subject}}!"
              />
              <p className="text-xs text-gray-500 mt-1">Use {'{{variable}}'} for dynamic content.</p>
            </div>
          </div>
        )}

        {nodeType.includes('NOTION_PAGE') && (
          <div>
            <h3 className="font-medium mb-2">Notion Page Action</h3>
            <Input
              label="Database ID"
              value={config.databaseId || ''}
              onChange={(e) => handleChange('databaseId', e.target.value)}
              placeholder="Notion Database ID"
            />
             <div className="flex flex-col mb-4">
              <label className="mb-1 text-sm font-medium text-gray-700">Properties (JSON)</label>
              <textarea
                className="px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-32"
                value={typeof config.properties === 'string' ? config.properties : JSON.stringify(config.properties, null, 2)}
                onChange={(e) => handleChange('properties', e.target.value)}
                placeholder='{ "Name": { "title": [ { "text": { "content": "{{subject}}" } } ] } }'
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};
