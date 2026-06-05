import React, { useState } from 'react'
import { Button } from '@atomaton/ui'
import { GlobalSettingsModal } from './GlobalSettingsModal'

export const Sidebar: React.FC<{
  workflowName: string
  onChangeName: (name: string) => void
  onSave: () => void
  onTest: () => void
  isSaving?: boolean
  isDirty?: boolean
}> = ({
  workflowName,
  onChangeName,
  onSave,
  onTest,
  isSaving = false,
  isDirty = false,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col gap-4 z-20">
      <div className="flex flex-col gap-1 mb-2">
        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Workflow Name
        </label>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8A3FFC] focus:bg-white/10 transition-all duration-300"
          placeholder="Workflow Name"
        />
      </div>
      <div className="space-y-2">
        <Button
          variant="secondary"
          onClick={onSave}
          className="w-full"
          disabled={isSaving || !isDirty}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button onClick={onTest} className="w-full">
          Run Test
        </Button>
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
        <div className="text-xs font-semibold text-[#8A3FFC] mb-2">
          Triggers
        </div>
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
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#00F5A0]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'action-http')}
          draggable
        >
          HTTP Request
        </div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#00F5A0]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'action-regex-replace')}
          draggable
        >
          Regex Replace
        </div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#00F5A0]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'action-google-bridge')}
          draggable
        >
          Google Bridge
        </div>
        <div
          className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-grab mb-2 hover:bg-white/10 hover:border-[#00F5A0]/50 transition-all text-white text-sm"
          onDragStart={(event) => onDragStart(event, 'action-url-decode')}
          draggable
        >
          URL Decode
        </div>
      </div>

      <GlobalSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </aside>
  )
}
