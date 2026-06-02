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
  RegexReplaceActionConfig,
  GoogleBridgeActionConfig,
  UrlDecodeActionConfig,
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
  triggerConfig?: NodeConfig
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

const extractJsonPaths = (obj: unknown, prefix = ''): string[] => {
  if (obj === null || obj === undefined) return []
  let paths: string[] = []

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      paths.push(`${prefix}[]`)
    } else {
      const firstItem = obj[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        paths = [...paths, ...extractJsonPaths(firstItem, `${prefix}[0]`)]
      } else {
        paths.push(`${prefix}[0]`)
      }
    }
  } else if (typeof obj === 'object') {
    const typedObj = obj as Record<string, unknown>
    for (const key in typedObj) {
      if (Object.prototype.hasOwnProperty.call(typedObj, key)) {
        const value = typedObj[key]
        const currentPath = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'object' && value !== null) {
          paths = [...paths, ...extractJsonPaths(value, currentPath)]
        } else {
          paths.push(currentPath)
        }
      }
    }
  } else {
    paths.push(prefix)
  }

  return paths
}

const VariablePicker: React.FC<{
  triggerType?: string
  triggerConfig?: NodeConfig
  onSelect: (variable: string) => void
}> = ({ triggerType, triggerConfig, onSelect }) => {
  let variables: string[] = []
  let infoMessage: string | null = null

  if (triggerType === 'trigger-webhook') {
    const payloadStr = (triggerConfig as WebhookTriggerNodeConfig)
      ?.samplePayload
    if (payloadStr) {
      try {
        const parsed = JSON.parse(payloadStr)
        const paths = extractJsonPaths(parsed)
        variables = paths.map((p) => `{{${p}}}`)
      } catch {
        infoMessage = 'Invalid Sample JSON Payload in Webhook trigger.'
      }
    }

    if (variables.length === 0 && !infoMessage) {
      variables = ['{{subject}}', '{{amount}}', '{{status}}']
      infoMessage =
        'Paste a Sample JSON Payload in your Webhook Trigger to unlock custom fields.'
    }
  } else {
    // Default IMAP Email Trigger
    variables = ['{{subject}}', '{{from}}', '{{date}}', '{{body}}']
  }

  return (
    <div className="flex flex-col gap-1 mt-3">
      <span className="text-[10px] text-white/40">
        Suggested variables from Trigger:
      </span>
      {infoMessage && (
        <span className="text-[9px] text-amber-400/80 italic mb-1 leading-snug">
          {infoMessage}
        </span>
      )}
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
  allowCustomField?: boolean
}> = ({ rules = [], onChange, allowCustomField = false }) => {
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
            {allowCustomField ? (
              <input
                className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
                value={rule.field}
                onChange={(e) => updateRule(index, 'field', e.target.value)}
                placeholder="Field (e.g. data.from)"
              />
            ) : (
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
            )}
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
              {allowCustomField && (
                <>
                  <option value="startsWith" className="bg-[#0D0E12]">
                    Starts With
                  </option>
                  <option value="endsWith" className="bg-[#0D0E12]">
                    Ends With
                  </option>
                  <option value="regex" className="bg-[#0D0E12]">
                    Regex Match
                  </option>
                  <option value="gt" className="bg-[#0D0E12]">
                    Greater Than
                  </option>
                  <option value="gte" className="bg-[#0D0E12]">
                    Greater Than or Equal
                  </option>
                  <option value="lt" className="bg-[#0D0E12]">
                    Less Than
                  </option>
                  <option value="lte" className="bg-[#0D0E12]">
                    Less Than or Equal
                  </option>
                  <option value="isEmpty" className="bg-[#0D0E12]">
                    Is Empty
                  </option>
                  <option value="isNotEmpty" className="bg-[#0D0E12]">
                    Is Not Empty
                  </option>
                </>
              )}
            </select>
            {rule.operator !== 'isEmpty' && rule.operator !== 'isNotEmpty' ? (
              <input
                className="w-1/3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
                value={rule.value}
                onChange={(e) => updateRule(index, 'value', e.target.value)}
                placeholder="Value"
              />
            ) : (
              <div className="w-1/3 px-3 py-2 text-white/30 text-xs italic">
                (no value)
              </div>
            )}
            <button
              onClick={() => removeRule(index)}
              className="text-[#FF2E63] hover:text-red-400 transition-colors text-xl font-bold"
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
  triggerConfig,
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
    setConfig((prev: NodeConfig) => {
      const next = { ...prev, [key]: value }
      onSave(next)
      return next
    })
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
                        Sample JSON Payload
                      </label>
                      <textarea
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] h-32 text-xs font-mono transition-all duration-200"
                        value={
                          (config as WebhookTriggerNodeConfig).samplePayload ||
                          ''
                        }
                        onChange={(e) => {
                          handleChange('samplePayload', e.target.value)
                        }}
                        placeholder={`{\n  "subject": "Payment Received",\n  "amount": 25000,\n  "status": "success"\n}`}
                      />
                      {(() => {
                        const payload = (config as WebhookTriggerNodeConfig)
                          .samplePayload
                        if (payload) {
                          try {
                            JSON.parse(payload)
                            return (
                              <span className="mt-1 text-[10px] text-[#00F5A0]">
                                ✓ Valid JSON
                              </span>
                            )
                          } catch {
                            return (
                              <span className="mt-1 text-[10px] text-[#FF2E63]">
                                ✗ Invalid JSON format
                              </span>
                            )
                          }
                        }
                        return null
                      })()}
                    </div>

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

                    <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
                      <label className="mb-2 text-sm font-medium text-white/80">
                        Google Apps Script (Gmail Real-time Sync)
                      </label>
                      <p className="text-[10px] text-white/50 mb-2 leading-relaxed">
                        Copy this script into your Google Apps Script, set up a
                        1-minute time-driven trigger. It will monitor Gmail in
                        real-time and post unread emails to this webhook,
                        marking them read.
                      </p>
                      <div className="relative">
                        <pre className="p-3 bg-[#0D0E12]/80 border border-[#0D0E12] rounded-xl text-[9px] text-[#00F5A0] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-normal max-h-40 overflow-y-auto pr-12">
                          {`function monitorGmail() {
  const query = "is:unread";
  const webhookUrl = "${window.location.origin}/api/webhook/${userId}/${triggerId}";
  const apiKey = "${(config as WebhookTriggerNodeConfig).apiKey || ''}";
  
  const threads = GmailApp.search(query, 0, 10);
  for (let i = 0; i < threads.length; i++) {
    const messages = threads[i].getMessages();
    for (let j = 0; j < messages.length; j++) {
      const message = messages[j];
      if (message.isUnread()) {
        const payload = {
          subject: message.getSubject(),
          from: message.getFrom(),
          date: message.getDate().toISOString(),
          body: message.getPlainBody().substring(0, 1900)
        };
        
        const options = {
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer " + apiKey
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        
        try {
          UrlFetchApp.fetch(webhookUrl, options);
          message.markRead();
        } catch (e) {
          Logger.log("Error sending webhook: " + e.toString());
        }
      }
    }
  }
}`}
                        </pre>
                        <Button
                          variant="secondary"
                          type="button"
                          className="absolute right-2 top-2 !px-2 !py-0.5 text-[9px]"
                          onClick={() => {
                            const scriptText = `function monitorGmail() {
  const query = "is:unread";
  const webhookUrl = "${window.location.origin}/api/webhook/${userId}/${triggerId}";
  const apiKey = "${(config as WebhookTriggerNodeConfig).apiKey || ''}";
  
  const threads = GmailApp.search(query, 0, 10);
  for (let i = 0; i < threads.length; i++) {
    const messages = threads[i].getMessages();
    for (let j = 0; j < messages.length; j++) {
      const message = messages[j];
      if (message.isUnread()) {
        const payload = {
          subject: message.getSubject(),
          from: message.getFrom(),
          date: message.getDate().toISOString(),
          body: message.getPlainBody().substring(0, 1900)
        };
        
        const options = {
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer " + apiKey
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        
        try {
          UrlFetchApp.fetch(webhookUrl, options);
          message.markRead();
        } catch (e) {
          Logger.log("Error sending webhook: " + e.toString());
        }
      }
    }
  }
}`
                            navigator.clipboard.writeText(scriptText)
                            alert('GAS Gmail Sync Script copied to clipboard!')
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
              allowCustomField={true}
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

        {nodeType === 'action-regex-replace' &&
          (() => {
            const regexConfig = config as RegexReplaceActionConfig
            return (
              <>
                <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">
                  Regex Replace
                </h3>
                <Input
                  label="Input Text"
                  value={regexConfig.inputText || ''}
                  onChange={(e) => handleChange('inputText', e.target.value)}
                  placeholder="e.g. {{trigger.body}}"
                />
                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-[#00F5A0] text-xs uppercase tracking-wider font-bold">
                    Replacement Rules
                  </label>
                  <div className="space-y-3">
                    {(regexConfig.rules || []).map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-center bg-white/[0.02] p-2 border border-white/10 rounded-xl relative group"
                      >
                        <div className="flex-1 space-y-2">
                          <input
                            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                            value={rule.pattern || ''}
                            onChange={(e) => {
                              const newRules = [...(regexConfig.rules || [])]
                              newRules[idx] = {
                                ...newRules[idx],
                                pattern: e.target.value,
                              }
                              handleChange('rules', newRules)
                            }}
                            placeholder="Pattern (e.g. Error:\s)"
                          />
                          <input
                            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                            value={rule.replacement || ''}
                            onChange={(e) => {
                              const newRules = [...(regexConfig.rules || [])]
                              newRules[idx] = {
                                ...newRules[idx],
                                replacement: e.target.value,
                              }
                              handleChange('rules', newRules)
                            }}
                            placeholder="Replacement Text"
                          />
                          <input
                            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                            value={rule.flags || 'g'}
                            onChange={(e) => {
                              const newRules = [...(regexConfig.rules || [])]
                              newRules[idx] = {
                                ...newRules[idx],
                                flags: e.target.value,
                              }
                              handleChange('rules', newRules)
                            }}
                            placeholder="Flags (default: g)"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newRules = (regexConfig.rules || []).filter(
                              (_, i) => i !== idx
                            )
                            handleChange('rules', newRules)
                          }}
                          className="text-[#FF2E63] hover:text-red-400 transition-colors text-xl font-bold p-1 self-start"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const rules = regexConfig.rules || []
                      handleChange('rules', [
                        ...rules,
                        { pattern: '', replacement: '', flags: 'g' },
                      ])
                    }}
                    className="mt-3 text-xs text-[#00F5A0] hover:text-[#00c883] hover:underline text-left font-bold"
                  >
                    + Add Regex Rule
                  </button>
                </div>
                <Input
                  label="Output Variable Name"
                  value={regexConfig.outputVariable || ''}
                  onChange={(e) =>
                    handleChange('outputVariable', e.target.value)
                  }
                  placeholder="e.g. cleaned_body"
                />
              </>
            )
          })()}

        {nodeType === 'action-google-bridge' &&
          (() => {
            const googleConfig = config as GoogleBridgeActionConfig
            return (
              <>
                <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">
                  Google Apps Script Bridge
                </h3>
                <Input
                  label="GAS Web App URL"
                  value={googleConfig.webAppUrl || ''}
                  onChange={(e) => handleChange('webAppUrl', e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Action Type
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent transition-all"
                    value={googleConfig.action || 'APPEND_ROW'}
                    onChange={(e) => handleChange('action', e.target.value)}
                  >
                    <option value="APPEND_ROW" className="bg-[#0D0E12]">
                      APPEND_ROW (Add Sheets row)
                    </option>
                    <option value="SEND_EMAIL" className="bg-[#0D0E12]">
                      SEND_EMAIL (Send Gmail)
                    </option>
                    <option
                      value="CREATE_CALENDAR_EVENT"
                      className="bg-[#0D0E12]"
                    >
                      CREATE_CALENDAR_EVENT (Add Calendar Event)
                    </option>
                    <option value="CUSTOM" className="bg-[#0D0E12]">
                      CUSTOM (Define custom action)
                    </option>
                  </select>
                </div>
                {(googleConfig.action === 'CUSTOM' ||
                  ![
                    'APPEND_ROW',
                    'SEND_EMAIL',
                    'CREATE_CALENDAR_EVENT',
                  ].includes(googleConfig.action || '')) && (
                  <Input
                    label="Custom Action Name"
                    value={googleConfig.action || ''}
                    onChange={(e) => handleChange('action', e.target.value)}
                    placeholder="e.g. DELETE_ROW"
                  />
                )}
                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Payload Parameters (JSON)
                  </label>
                  <textarea
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] h-40 text-xs font-mono transition-all"
                    value={
                      typeof googleConfig.payload === 'object'
                        ? JSON.stringify(googleConfig.payload, null, 2)
                        : (googleConfig.payload as string) || ''
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        handleChange('payload', parsed)
                      } catch {
                        handleChange('payload', e.target.value)
                      }
                    }}
                    placeholder={`{\n  "spreadsheetId": "YOUR_SHEET_ID",\n  "sheetName": "Sheet1",\n  "rowValues": ["{{trigger.subject}}", "{{trigger.from}}"]\n}`}
                  />
                  {(() => {
                    const p = googleConfig.payload
                    if (p) {
                      try {
                        if (typeof p === 'string') JSON.parse(p)
                        return (
                          <span className="mt-1 text-[10px] text-[#00F5A0]">
                            ✓ Valid JSON
                          </span>
                        )
                      } catch {
                        return (
                          <span className="mt-1 text-[10px] text-[#FF2E63]">
                            ✗ Invalid JSON format
                          </span>
                        )
                      }
                    }
                    return null
                  })()}
                  <div className="mt-2 text-xs space-y-1">
                    <span className="text-white/40 block">
                      Suggested Template Actions:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/70 text-[10px] transition-all"
                        onClick={() => {
                          handleChange('action', 'APPEND_ROW')
                          handleChange('payload', {
                            spreadsheetId: 'YOUR_SPREADSHEET_ID',
                            sheetName: 'Sheet1',
                            rowValues: [
                              '{{trigger.subject}}',
                              '{{trigger.from}}',
                              '{{trigger.date}}',
                            ],
                          })
                        }}
                      >
                        APPEND_ROW
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/70 text-[10px] transition-all"
                        onClick={() => {
                          handleChange('action', 'SEND_EMAIL')
                          handleChange('payload', {
                            to: 'admin@example.com',
                            subject: 'Alert: {{trigger.subject}}',
                            body: 'Received message from {{trigger.from}}',
                          })
                        }}
                      >
                        SEND_EMAIL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col mt-4 pt-4 border-t border-white/10 bg-[#0D0E12]/40 p-3 rounded-xl border border-white/5">
                  <label className="mb-2 text-xs font-bold text-white/80 uppercase tracking-wider">
                    Google Apps Script Web App Template
                  </label>
                  <p className="text-[10px] text-white/50 mb-2 leading-relaxed">
                    Create a project in Google Apps Script, paste this template,
                    and deploy it as a &quot;Web App&quot; (Execute as Me, Who
                    has access: Anyone).
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-[#0D0E12]/80 border border-[#0D0E12] rounded-xl text-[9px] text-[#00F5A0] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-normal max-h-40 overflow-y-auto">
                      {`function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload || {};
    
    let result = {};
    
    if (action === "APPEND_ROW") {
      const sheet = SpreadsheetApp.openById(payload.spreadsheetId).getSheetByName(payload.sheetName || "Sheet1");
      sheet.appendRow(payload.rowValues || []);
      result = { success: true, message: "Row appended" };
    } else if (action === "SEND_EMAIL") {
      MailApp.sendEmail(payload.to, payload.subject, payload.body);
      result = { success: true, message: "Email sent" };
    } else if (action === "CREATE_CALENDAR_EVENT") {
      const calendar = CalendarApp.getCalendarById(payload.calendarId || "primary");
      calendar.createEvent(payload.title, new Date(payload.startTime), new Date(payload.endTime), {
        description: payload.description || ""
      });
      result = { success: true, message: "Event created" };
    } else {
      throw new Error("Unknown action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`}
                    </pre>
                    <Button
                      variant="secondary"
                      type="button"
                      className="mt-2 w-full text-[10px] !py-1 bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      onClick={() => {
                        const scriptText = `function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload || {};
    
    let result = {};
    
    if (action === "APPEND_ROW") {
      const sheet = SpreadsheetApp.openById(payload.spreadsheetId).getSheetByName(payload.sheetName || "Sheet1");
      sheet.appendRow(payload.rowValues || []);
      result = { success: true, message: "Row appended" };
    } else if (action === "SEND_EMAIL") {
      MailApp.sendEmail(payload.to, payload.subject, payload.body);
      result = { success: true, message: "Email sent" };
    } else if (action === "CREATE_CALENDAR_EVENT") {
      const calendar = CalendarApp.getCalendarById(payload.calendarId || "primary");
      calendar.createEvent(payload.title, new Date(payload.startTime), new Date(payload.endTime), {
        description: payload.description || ""
      });
      result = { success: true, message: "Event created" };
    } else {
      throw new Error("Unknown action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`
                        navigator.clipboard.writeText(scriptText)
                        alert('GAS Web App Template copied to clipboard!')
                      }}
                    >
                      Copy GAS Web App Code
                    </Button>
                  </div>
                </div>
              </>
            )
          })()}

        {nodeType === 'action-url-decode' &&
          (() => {
            const urlConfig = config as UrlDecodeActionConfig
            return (
              <>
                <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">
                  URL Decode
                </h3>
                <Input
                  label="Input Text"
                  value={urlConfig.inputText || ''}
                  onChange={(e) => handleChange('inputText', e.target.value)}
                  placeholder="e.g. {{trigger.body}}"
                />
                <Input
                  label="Output Variable Name"
                  value={urlConfig.outputVariable || ''}
                  onChange={(e) =>
                    handleChange('outputVariable', e.target.value)
                  }
                  placeholder="e.g. decoded_body"
                />
              </>
            )
          })()}

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
                triggerConfig={triggerConfig}
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

      <div className="pt-6 border-t border-white/10 flex justify-end mt-auto">
        <Button className="w-full" onClick={onClose}>
          Close Settings
        </Button>
      </div>
    </div>
  )
}
