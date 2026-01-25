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
    <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4">
      <div className="text-lg font-bold text-gray-800 mb-2">Workflow</div>
      <div className="space-y-2">
        <Button variant="secondary" onClick={onSave} disabled={!isValid} className="w-full">
          Save
        </Button>
        <Button onClick={onTest} className="w-full">Run Test</Button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
        >
          Global Settings
        </button>
      </div>

      <hr className="my-4" />

      <div className="text-sm font-bold text-gray-500 uppercase">Toolbox</div>
      
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-2">Triggers</div>
        <div
          className="p-2 bg-blue-50 border border-blue-200 rounded cursor-grab mb-2 hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'trigger')}
          draggable
        >
          IMAP Email
        </div>
        <div
          className="p-2 bg-blue-50 border border-blue-200 rounded cursor-grab mb-2 hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'trigger-webhook')}
          draggable
        >
          Incoming Webhook
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 mb-2">Logic</div>
        <div
          className="p-2 bg-purple-50 border border-purple-200 rounded cursor-grab mb-2 hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'condition')}
          draggable
        >
          Condition (If/Else)
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 mb-2">Actions</div>
        <div
          className="p-2 bg-green-50 border border-green-200 rounded cursor-grab mb-2 hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'action')}
          draggable
        >
          Discord Webhook
        </div>
        <div
          className="p-2 bg-green-50 border border-green-200 rounded cursor-grab mb-2 hover:shadow-md transition-shadow"
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
