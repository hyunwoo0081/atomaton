import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@atomaton/ui'
import type { Node } from 'reactflow'
import { getTriggerSamplePresets } from '../types/workflow'
import type {
  CustomNodeData,
  TestResult,
  WebhookTriggerNodeConfig,
  TriggerNodeConfig,
} from '../types/workflow'

interface TestRunModalProps {
  isOpen: boolean
  nodes: Node<CustomNodeData>[]
  onClose: () => void
  onRun: (
    inputData: Record<string, unknown>,
    startNodeId?: string
  ) => Promise<TestResult>
}

const getDefaultPayloadForNode = (node: Node<CustomNodeData>): string => {
  const config = node.data?.config as
    | TriggerNodeConfig
    | WebhookTriggerNodeConfig
    | undefined
  const samplePayload = config?.samplePayload
  if (samplePayload && samplePayload.trim()) {
    try {
      return JSON.stringify(JSON.parse(samplePayload), null, 2)
    } catch {
      return samplePayload
    }
  }

  if (node.type === 'trigger-webhook') {
    return JSON.stringify(
      {
        event: 'test_webhook_event',
        timestamp: new Date().toISOString(),
        payload: {
          id: 'test-123',
          status: 'success',
          message: 'Hello from test webhook',
        },
      },
      null,
      2
    )
  }

  // IMAP email payload
  return JSON.stringify(
    {
      subject: 'Test Email Subject',
      from: 'test@example.com',
      date: new Date().toISOString(),
      body: 'This is a test email body.',
      messageId: '<sample-msg-001@mail.naver.com>',
      source: 'NAVER_IMAP',
    },
    null,
    2
  )
}

const getTriggerLabel = (node: Node<CustomNodeData>, idx: number): string => {
  const customDesc = node.data?.config?.description
  if (customDesc) return customDesc
  if (node.type === 'trigger-webhook') {
    const config = node.data?.config as WebhookTriggerNodeConfig | undefined
    const token = config?.webhookToken
    return token
      ? `Webhook #${idx + 1} (${token.substring(0, 10)}...)`
      : `Webhook #${idx + 1}`
  }
  if (node.type === 'trigger') {
    const config = node.data?.config as TriggerNodeConfig | undefined
    const mailbox = config?.mailbox || 'INBOX'
    return `IMAP Email (${mailbox})`
  }
  return `Trigger #${idx + 1}`
}

export const TestRunModal: React.FC<TestRunModalProps> = ({
  isOpen,
  nodes,
  onClose,
  onRun,
}) => {
  const triggerNodes = nodes.filter((n) => n.type.startsWith('trigger'))
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('')
  const [inputData, setInputData] = useState<string>('{}')
  const [result, setResult] = useState<TestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const selectedTriggerNode = triggerNodes.find(
    (n) => n.id === selectedTriggerId
  )
  const samplePresets = selectedTriggerNode
    ? getTriggerSamplePresets(selectedTriggerNode.type)
    : []

  let jsonError: string | null = null
  try {
    JSON.parse(inputData)
  } catch (err: unknown) {
    jsonError = err instanceof Error ? err.message : 'Invalid JSON format'
  }

  useEffect(() => {
    if (isOpen) {
      if (triggerNodes.length > 0) {
        const defaultTrigger = triggerNodes[0]
        setSelectedTriggerId(defaultTrigger.id)
        setInputData(getDefaultPayloadForNode(defaultTrigger))
      } else {
        setSelectedTriggerId('')
        setInputData('{}')
      }
      setResult(null)
    }
  }, [isOpen, nodes])

  useEffect(() => {
    const dialog = dialogRef.current
    if (isOpen) {
      if (dialog && !dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog && dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  const handleTriggerChange = (triggerId: string) => {
    setSelectedTriggerId(triggerId)
    const targetNode = triggerNodes.find((n) => n.id === triggerId)
    if (targetNode) {
      setInputData(getDefaultPayloadForNode(targetNode))
    }
  }

  const handleResetPayload = () => {
    const targetNode = triggerNodes.find((n) => n.id === selectedTriggerId)
    if (targetNode) {
      setInputData(getDefaultPayloadForNode(targetNode))
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)
    try {
      const parsedData = JSON.parse(inputData)
      const res = await onRun(parsedData, selectedTriggerId || undefined)
      setResult(res)
    } catch (error: unknown) {
      let errorMessage = 'Execution Failed'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      setResult({ error: errorMessage })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto border-0 bg-transparent p-0 outline-none backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="bg-[#0D0E12]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Test Workflow</h3>
            <p className="text-xs text-white/50 mt-1">
              Test execution starting from a chosen trigger node
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {triggerNodes.length > 1 && (
            <div className="mb-5 p-4 bg-white/[0.03] border border-[#8A3FFC]/30 rounded-2xl">
              <label className="block text-xs font-semibold text-[#8A3FFC] mb-2 uppercase tracking-wider">
                Select Starting Trigger ({triggerNodes.length} triggers
                detected)
              </label>
              <select
                className="w-full px-3 py-2 bg-[#0D0E12] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8A3FFC]"
                value={selectedTriggerId}
                onChange={(e) => handleTriggerChange(e.target.value)}
              >
                {triggerNodes.map((tNode, index) => (
                  <option key={tNode.id} value={tNode.id}>
                    {getTriggerLabel(tNode, index)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] text-white/50">
                The test will simulate this trigger and execute only the
                connected DAG pathway.
              </p>
            </div>
          )}

          {triggerNodes.length === 1 && (
            <div className="mb-4 flex items-center justify-between px-3.5 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white/70">
              <span>
                Starting Trigger:{' '}
                <strong className="text-white">
                  {getTriggerLabel(triggerNodes[0], 0)}
                </strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#8A3FFC]/20 text-[#8A3FFC] text-[10px] font-mono font-medium">
                Single Trigger
              </span>
            </div>
          )}

          {triggerNodes.length === 0 && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs leading-relaxed">
              ⚠️ No trigger nodes found in this workflow. Please add at least
              one trigger node (Webhook or IMAP) before testing.
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/80">
                Input Data (Trigger Payload)
              </label>
              {selectedTriggerId && (
                <button
                  type="button"
                  onClick={handleResetPayload}
                  className="text-xs text-[#8A3FFC] hover:text-[#E02DFF] transition-colors"
                >
                  ↻ Reset to Node Sample
                </button>
              )}
            </div>
            {samplePresets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-[10px] text-white/40 uppercase tracking-wider mr-1">
                  Inject Sample:
                </span>
                {samplePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setInputData(
                        JSON.stringify(preset.buildPayload(), null, 2)
                      )
                    }
                    className="px-2.5 py-1 bg-white/5 hover:bg-[#8A3FFC]/20 border border-white/10 hover:border-[#8A3FFC]/50 rounded-lg text-[11px] text-white/80 hover:text-white transition-all"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            )}
            <textarea
              className="w-full h-44 p-4 bg-white/5 border border-white/10 rounded-xl font-mono text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] transition-all leading-normal"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
            />
            {jsonError ? (
              <p className="mt-1.5 text-[11px] text-[#FF2E63]">
                ✗ Invalid JSON: {jsonError}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-[#00F5A0]">✓ Valid JSON</p>
            )}
          </div>

          {result && (
            <div className="mb-4 animate-fade-in">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Execution Result
              </label>
              <div
                className={`p-4 rounded-xl border text-xs font-mono whitespace-pre-wrap overflow-auto max-h-60 ${
                  result.error
                    ? 'bg-[#FF2E63]/10 border-[#FF2E63]/30 text-[#FF2E63]'
                    : 'bg-[#00F5A0]/10 border-[#00F5A0]/30 text-[#00F5A0]'
                }`}
              >
                {JSON.stringify(result, null, 2)}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleRun}
            disabled={isRunning || triggerNodes.length === 0}
          >
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
