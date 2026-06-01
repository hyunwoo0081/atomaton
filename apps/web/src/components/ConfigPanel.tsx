import React, { useState, useEffect } from 'react'
import { Button, Input } from '@atomaton/ui'
import { api } from '../utils/api'
import { useQuery } from '@tanstack/react-query'
import { AccountConnectionModal } from './AccountConnectionModal'
import type {
  NodeConfig,
  TriggerNodeConfig,
  DiscordActionConfig,
  ConditionNodeConfig,
  ConditionRule,
  AccountResponse,
  HttpActionConfig,
  WebhookTriggerNodeConfig,
} from '../types/workflow'

interface ConfigPanelProps {
  nodeId: string
  nodeType: string
  initialConfig: NodeConfig
  onSave: (config: NodeConfig) => void
  onClose: () => void
  userId?: string
  triggerId?: string
  onSaveWorkflow?: () => void
  triggerType?: string
}

const AccountSelect: React.FC<{
  value: string
  onChange: (val: string) => void
}> = ({ value, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: accounts = [] } = useQuery<AccountResponse[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts'),
  })

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-2 text-sm font-medium text-white/80">Account</label>
      <select
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] focus:border-transparent transition-all duration-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" className="bg-[#0D0E12]">
          Select an account...
        </option>
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
      <AccountConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

const VariablePicker: React.FC<{
  triggerType?: string
  onSelect: (variable: string) => void
}> = ({ triggerType, onSelect }) => {
  const variables =
    triggerType === 'trigger-webhook'
      ? ['{{subject}}', '{{amount}}', '{{status}}']
      : ['{{subject}}', '{{from}}', '{{date}}', '{{body}}']
  return (
    <div className="flex flex-col gap-1 mt-3">
      <span className="text-[10px] text-white/40">
        Suggested variables from Trigger:
      </span>
      <div className="flex flex-wrap gap-2 mt-1">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-full border border-white/10 text-white/80 transition-all font-mono"
            onClick={() => onSelect(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

const FilterRules: React.FC<{
  rules: ConditionRule[]
  onChange: (rules: ConditionRule[]) => void
}> = ({ rules = [], onChange }) => {
  const addRule = () => {
    onChange([...rules, { field: 'subject', operator: 'contains', value: '' }])
  }

  const updateRule = (index: number, key: keyof ConditionRule, val: string) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [key]: val }
    onChange(newRules)
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
  }

  return (
    <div className="mb-4">
      <label className="mb-2 text-sm font-medium text-white/80">
        Filter Rules
      </label>
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="flex gap-2 items-center">
            <select
              className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
              value={rule.field}
              onChange={(e) => updateRule(index, 'field', e.target.value)}
            >
              <option value="subject" className="bg-[#0D0E12]">
                Subject
              </option>
              <option value="from" className="bg-[#0D0E12]">
                From
              </option>
            </select>
            <select
              className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
              value={rule.operator}
              onChange={(e) => updateRule(index, 'operator', e.target.value)}
            >
              <option value="contains" className="bg-[#0D0E12]">
                Contains
              </option>
              <option value="equals" className="bg-[#0D0E12]">
                Equals
              </option>
            </select>
            <input
              className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
              value={rule.value}
              onChange={(e) => updateRule(index, 'value', e.target.value)}
              placeholder="Value"
            />
            <button
              onClick={() => removeRule(index)}
              className="text-[#FF2E63] hover:text-red-400 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addRule}
        className="mt-3 text-xs text-[#8A3FFC] hover:text-[#E02DFF] hover:underline transition-colors"
      >
        + Add Condition
      </button>
    </div>
  )
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  nodeId,
  nodeType,
  initialConfig,
  onSave,
  onClose,
  userId,
  triggerId,
  onSaveWorkflow,
  triggerType,
}) => {
  const [config, setConfig] = useState<NodeConfig>(
    initialConfig || ({} as NodeConfig)
  )

  useEffect(() => {
    // Only update if the config or node really changed
    if (JSON.stringify(initialConfig) !== JSON.stringify(config)) {
      setConfig(initialConfig || ({} as NodeConfig))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, initialConfig])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleChange = (
    key: string,
    value: string | number | boolean | object | ConditionRule[]
  ) => {
    setConfig((prev: NodeConfig) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(config)
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white/5 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto z-50 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-white">Configuration</h2>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-8">
        {(nodeType === 'trigger' || nodeType === 'trigger-webhook') && (
          <>
            <h3 className="font-bold text-lg text-[#8A3FFC] border-b border-white/10 pb-2">
              {nodeType === 'trigger'
                ? 'IMAP Email Trigger'
                : 'Incoming Webhook Trigger'}
            </h3>
            {nodeType === 'trigger' && (
              <>
                <AccountSelect
                  value={(config as TriggerNodeConfig).accountId || ''}
                  onChange={(val) => handleChange('accountId', val)}
                />
                <Input
                  label="Mailbox"
                  value={(config as TriggerNodeConfig).mailbox || 'INBOX'}
                  onChange={(e) => handleChange('mailbox', e.target.value)}
                />
                <Input
                  label="Polling Interval (min)"
                  type="number"
                  value={(config as TriggerNodeConfig).interval || 30}
                  onChange={(e) =>
                    handleChange('interval', parseInt(e.target.value, 10))
                  }
                />
                <FilterRules
                  rules={(config as TriggerNodeConfig).rules || []}
                  onChange={(rules) => handleChange('rules', rules)}
                />
              </>
            )}
            {nodeType === 'trigger-webhook' && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Webhook URL
                  </label>
                  {triggerId && userId ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none"
                        value={`${window.location.origin}/api/webhook/${userId}/${triggerId}`}
                      />
                      <Button
                        variant="secondary"
                        type="button"
                        className="!px-3 !py-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/api/webhook/${userId}/${triggerId}`
                          )
                          alert('Webhook URL copied!')
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl text-center space-y-3">
                      <div className="text-amber-400 text-lg">⚠️</div>
                      <p className="text-xs text-white/60">
                        Webhook URL is not generated yet. You must save the
                        workflow to register the trigger in the system.
                      </p>
                      <Button
                        variant="primary"
                        type="button"
                        className="w-full text-xs bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white"
                        onClick={() => {
                          // First save node config locally
                          onSave(config)
                          // Then call the global save workflow operation
                          if (onSaveWorkflow) {
                            onSaveWorkflow()
                          }
                        }}
                      >
                        Save & Generate Webhook
                      </Button>
                    </div>
                  )}
                </div>
                {triggerId && userId && (
                  <>
                    <div className="flex flex-col">
                      <label className="mb-2 text-sm font-medium text-white/80">
                        API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none"
                          value={
                            (config as WebhookTriggerNodeConfig).apiKey || ''
                          }
                        />
                        <Button
                          variant="secondary"
                          type="button"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              (config as WebhookTriggerNodeConfig).apiKey || ''
                            )
                            alert('API Key copied!')
                          }}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => {
                            const newKey =
                              'at_' +
                              Math.random().toString(36).substring(2, 15) +
                              Math.random().toString(36).substring(2, 15)
                            handleChange('apiKey', newKey)
                          }}
                        >
                          Regen
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-white/50">
                        Include this key in the Authorization header: <br />
                        <code className="text-[#00F5A0] font-mono">
                          Bearer &lt;API_KEY&gt;
                        </code>
                      </p>
                    </div>

                    <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
                      <label className="mb-2 text-sm font-medium text-white/80">
                        Sample Request (cURL)
                      </label>
                      <div className="relative">
                        <pre className="p-3 bg-[#0D0E12]/80 border border-[#0D0E12] rounded-xl text-[10px] text-[#00F5A0] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-normal pr-12">
                          {`curl -X POST "${window.location.origin}/api/webhook/${userId}/${triggerId}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${(config as WebhookTriggerNodeConfig).apiKey || '<API_KEY>'}" \\
  -d '{
    "subject": "Test Webhook",
    "amount": 25000,
    "status": "pending"
  }'`}
                        </pre>
                        <Button
                          variant="secondary"
                          type="button"
                          className="absolute right-2 top-2 !px-2 !py-0.5 text-[9px]"
                          onClick={() => {
                            const curlText = `curl -X POST "${window.location.origin}/api/webhook/${userId}/${triggerId}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${(config as WebhookTriggerNodeConfig).apiKey || '<API_KEY>'}" \\
  -d '{
    "subject": "Test Webhook",
    "amount": 25000,
    "status": "pending"
  }'`
                            navigator.clipboard.writeText(curlText)
                            alert('Sample cURL copied!')
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {nodeType === 'condition' && (
          <>
            <h3 className="font-bold text-lg text-[#E02DFF] border-b border-white/10 pb-2">
              Condition (If/Else)
            </h3>
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-sm font-medium text-white/80">
                Logic Type
              </label>
              <select
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E02DFF] focus:border-transparent"
                value={(config as ConditionNodeConfig).logicType || 'AND'}
                onChange={(e) => handleChange('logicType', e.target.value)}
              >
                <option value="AND" className="bg-[#0D0E12]">
                  AND (All match)
                </option>
                <option value="OR" className="bg-[#0D0E12]">
                  OR (Match one or more)
                </option>
              </select>
            </div>
            <FilterRules
              rules={(config as ConditionNodeConfig).conditions || []}
              onChange={(rules) => handleChange('conditions', rules)}
            />
          </>
        )}

        {nodeType === 'action-http' && (
          <>
            <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">
              HTTP Request
            </h3>
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-sm font-medium text-white/80">
                Method
              </label>
              <select
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#00F5A0]"
                value={(config as HttpActionConfig).method || 'GET'}
                onChange={(e) => handleChange('method', e.target.value)}
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m} className="bg-[#0D0E12]">
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="URL"
              value={(config as HttpActionConfig).url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://api.example.com/..."
            />
          </>
        )}

        {nodeType === 'action' && (
          <>
            <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">
              Discord Webhook
            </h3>
            <Input
              label="Webhook URL"
              value={(config as DiscordActionConfig).webhookUrl || ''}
              onChange={(e) => handleChange('webhookUrl', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-sm font-medium text-white/80">
                Message Content
              </label>
              <textarea
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-32 transition-all duration-200"
                value={(config as DiscordActionConfig).content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Hello {{subject}}!"
              />
              <VariablePicker
                triggerType={triggerType}
                onSelect={(v) =>
                  handleChange(
                    'content',
                    ((config as DiscordActionConfig).content || '') + v
                  )
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-6 border-t border-white/10 flex justify-end space-x-3 mt-auto">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Apply</Button>
      </div>
    </div>
  )
}
