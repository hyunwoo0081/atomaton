import React, { useState } from 'react';
import { Button } from '@atomaton/ui';
import { useWorkflowStore } from '../store/workflowStore';
import { GlobalSettingsModal } from './GlobalSettingsModal';

export const Sidebar: React.FC<{ onSave: () => void; onTest: () => void }> = ({ onSave, onTest }) => {
  const isValid = useWorkflowStore((state) => state.isValid);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col gap-4 z-20">
      <div className="text-lg font-bold text-white mb-2">Workflow</div>
      <div className="space-y-2">
        <Button variant="secondary" onClick={onSave} disabled={!isValid} className="w-full">
          Save
        </Button>
        <Button onClick={onTest} className="w-full">Run Test</Button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-full py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded border border-white/20 transition-colors"
        >
          Global Settings
        </button>
      </div>

      <hr className="my-4 border-white/10" />

      <div className="text-sm font-bold text-white/50 uppercase">Toolbox</div>
      
      <div>
        <div className="text-xs font-semibold text-[#8A3FFC] mb-2">Triggers</div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#8A3FFC]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'trigger')}
          draggable
        >
          IMAP Email
        </div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#8A3FFC]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'trigger-webhook')}
          draggable
        >
          Incoming Webhook
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-[#E02DFF] mb-2">Logic</div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#E02DFF]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'condition')}
          draggable
        >
          Condition (If/Else)
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-[#00F5A0] mb-2">Actions</div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#00F5A0]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'action')}
          draggable
        >
          Discord Webhook
        </div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#00F5A0]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'action-notion')}
          draggable
        >
          Notion Page
        </div>
      </div>

      <GlobalSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </aside>
  );
};
