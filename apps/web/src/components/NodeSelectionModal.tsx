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
  { type: 'action-http', label: 'HTTP Request', description: 'Generic HTTP API request.', category: 'Action' },
];

type Category = 'All' | 'Trigger' | 'Action' | 'Logic';

interface NodeSelectionModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (type: string) => void;
}

export const NodeSelectionModal: React.FC<NodeSelectionModalProps> = ({ isOpen, position, onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Category>('All');

  if (!isOpen) return null;

  const tabs: Category[] = ['All', 'Trigger', 'Action', 'Logic'];

  const filteredNodes = NODE_TYPES.filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'All' || node.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div
      className="fixed z-50 w-80 bg-[#0D0E12]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
      style={{ top: position.y, left: position.x }}
    >
      <div className="p-4 border-b border-white/5">
        <Input
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-0 bg-white/5 border-white/10 text-white placeholder-white/30"
        />
      </div>
      
      <div className="flex border-b border-white/5 bg-white/5">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab 
                ? 'text-[#8A3FFC] border-b-2 border-[#8A3FFC] bg-[#8A3FFC]/5' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
        {filteredNodes.map((node) => (
          <div
            key={node.type}
            className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all group"
            onClick={() => onSelect(node.type)}
          >
            <div className="font-bold text-sm text-white group-hover:text-[#8A3FFC] transition-colors">{node.label}</div>
            <div className="text-[11px] text-white/40 leading-relaxed">{node.description}</div>
          </div>
        ))}
        {filteredNodes.length === 0 && (
          <div className="p-8 text-center text-xs text-white/30 italic">No matches found.</div>
        )}
      </div>
      
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
};
