import React, { useState } from 'react';
import { Input } from '@atomaton/ui';

interface NodeType {
  type: string;
  label: string;
  description: string;
  category: 'Trigger' | 'Action' | 'Logic';
}

const NODE_TYPES: NodeType[] = [
  { type: 'trigger', label: 'IMAP Email', description: 'Trigger when an email is received.', category: 'Trigger' },
  { type: 'trigger-webhook', label: 'Incoming Webhook', description: 'Trigger via HTTP request.', category: 'Trigger' },
  { type: 'condition', label: 'Condition (If/Else)', description: 'Branch flow based on rules.', category: 'Logic' },
  { type: 'action', label: 'Discord Webhook', description: 'Send a message to Discord.', category: 'Action' },
  { type: 'action-notion', label: 'Notion Page', description: 'Create a page in Notion.', category: 'Action' },
];

interface NodeSelectionModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (type: string) => void;
}

export const NodeSelectionModal: React.FC<NodeSelectionModalProps> = ({ isOpen, position, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Trigger' | 'Action' | 'Logic'>('All');

  if (!isOpen) return null;

  const filteredNodes = NODE_TYPES.filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'All' || node.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div
      className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{ top: position.y, left: position.x }}
    >
      <div className="p-4 border-b border-gray-100">
        <Input
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-0"
        />
      </div>
      
      <div className="flex border-b border-gray-100">
        {['All', 'Trigger', 'Action', 'Logic'].map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2 text-xs font-medium ${
              activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        {filteredNodes.map((node) => (
          <div
            key={node.label}
            className="p-3 hover:bg-gray-50 rounded cursor-pointer transition-colors"
            onClick={() => onSelect(node.type)}
          >
            <div className="font-medium text-sm text-gray-900">{node.label}</div>
            <div className="text-xs text-gray-500">{node.description}</div>
          </div>
        ))}
        {filteredNodes.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">No nodes found.</div>
        )}
      </div>
      
      {/* Overlay to close when clicking outside */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
