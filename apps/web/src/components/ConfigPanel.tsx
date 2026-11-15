import React, { useState, useEffect, useRef } from 'react'
import { Button, Input } from '@atomaton/ui'
import { api } from '../utils/api'
import { useQuery } from '@tanstack/react-query'
import type { Node, Edge } from 'reactflow'
import { AccountConnectionModal } from './AccountConnectionModal'
import { useWorkflowStore } from '../store/workflowStore'
import { VariablePicker, extractJsonPaths } from './VariablePicker'
import { getTriggerSamplePresets } from '../types/workflow'
import type {
  NodeConfig,
  TriggerNodeConfig,
  DiscordActionConfig,
  ConditionNodeConfig,
  ConditionRule,
  AccountResponse,
  HttpActionConfig,
  HttpResponseMapping,
  WebhookTriggerNodeConfig,
  RegexReplaceActionConfig,
  GoogleBridgeActionConfig,
  UrlDecodeActionConfig,
  AiGenerateActionConfig,
  AiConditionConfig,
  SingleNodeTestResponse,
} from '../types/workflow'

interface ConfigPanelProps {
  nodeId: string
  nodeType: string
  initialConfig: NodeConfig
  onSave: (config: NodeConfig) => void
  onClose: () => void
  userId?: string
  workflowId?: string
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

const FilterRules: React.FC<{
  rules: ConditionRule[]
  onChange: (rules: ConditionRule[]) => void
  allowCustomField?: boolean
  nodeId?: string
  nodes?: Node[]
  edges?: Edge[]
}> = ({
  rules = [],
  onChange,
  allowCustomField = false,
  nodeId,
  nodes,
  edges,
}) => {
  const [focusedInput, setFocusedInput] = useState<{
    index: number
    key: 'field' | 'value'
  } | null>(null)

  const addRule = () => {
    onChange([
      ...rules,
      {
        field: allowCustomField ? '' : 'subject',
        operator: 'contains',
        value: '',
      },
    ])
  }

  const updateRule = (index: number, key: keyof ConditionRule, val: string) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [key]: val }
    onChange(newRules)
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
    if (focusedInput?.index === index) {
      setFocusedInput(null)
    }
  }

  const handleVariableInsert = (templateVar: string) => {
    const bareVarName = templateVar.replace(/^\{\{\s*|\s*\}\}$/g, '')
    if (rules.length === 0) {
      onChange([{ field: bareVarName, operator: 'equals', value: '' }])
      return
    }
    if (focusedInput && rules[focusedInput.index]) {
      const { index, key } = focusedInput
      const insertText = key === 'field' ? bareVarName : templateVar
      const currentVal = rules[index][key] || ''
      updateRule(
        index,
        key,
        key === 'field' ? insertText : `${currentVal}${insertText}`
      )
      return
    }
    const lastIdx = rules.length - 1
    if (!rules[lastIdx].field) {
      updateRule(lastIdx, 'field', bareVarName)
    } else {
      updateRule(
        lastIdx,
        'value',
        `${rules[lastIdx].value || ''}${templateVar}`
      )
    }
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
                onFocus={() => setFocusedInput({ index, key: 'field' })}
                onChange={(e) => updateRule(index, 'field', e.target.value)}
                placeholder="Field (e.g. http_status)"
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
                onFocus={() => setFocusedInput({ index, key: 'value' })}
                onChange={(e) => updateRule(index, 'value', e.target.value)}
                placeholder="Value"
              />
            ) : (
              <div className="w-1/3 px-3 py-2 text-white/30 text-xs italic">
                (no value)
              </div>
            )}
            <button
              type="button"
              onClick={() => removeRule(index)}
              className="text-[#FF2E63] hover:text-red-400 transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRule}
        className="mt-3 text-xs text-[#8A3FFC] hover:text-[#E02DFF] hover:underline transition-colors"
      >
        + Add Condition
      </button>
      {allowCustomField && nodeId && nodes && edges && (
        <VariablePicker
          currentNodeId={nodeId}
          nodes={nodes}
          edges={edges}
          onSelect={handleVariableInsert}
        />
      )}
    </div>
  )
}

interface TriggerSamplePayloadFieldProps {
  nodeType: string
  value: string
  onChange: (value: string) => void
}

/**
 * Shared sample JSON payload editor with quick preset injection and syntax validation
 * for both IMAP Email and Incoming Webhook triggers.
 */
const TriggerSamplePayloadField: React.FC<TriggerSamplePayloadFieldProps> = ({
  nodeType,
  value,
  onChange,
}) => {
  const presets = getTriggerSamplePresets(nodeType)
  const placeholder =
    nodeType === 'trigger-webhook'
      ? `{\n  "subject": "Payment Received",\n  "amount": 25000,\n  "status": "success"\n}`
      : `{\n  "subject": "Test Email Subject",\n  "from": "test@example.com",\n  "body": "This is a test email body."\n}`

  let isJsonValid: boolean | null = null
  if (value.trim()) {
    try {
      JSON.parse(value)
      isJsonValid = true
    } catch {
      isJsonValid = false
    }
  }

  return (
    <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
      <label className="mb-2 text-sm font-medium text-white/80">
        Sample JSON Payload
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="px-2.5 py-1 bg-white/5 hover:bg-[#8A3FFC]/20 border border-white/10 hover:border-[#8A3FFC]/50 rounded-lg text-[10px] text-white/80 hover:text-white transition-all"
            onClick={() =>
              onChange(JSON.stringify(preset.buildPayload(), null, 2))
            }
          >
            + {preset.label}
          </button>
        ))}
      </div>
      <textarea
        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] h-32 text-xs font-mono transition-all duration-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {isJsonValid === true && (
        <span className="mt-1 text-[10px] text-[#00F5A0]">✓ Valid JSON</span>
      )}
      {isJsonValid === false && (
        <span className="mt-1 text-[10px] text-[#FF2E63]">
          ✗ Invalid JSON format
        </span>
      )}
      <p className="mt-1.5 text-[10px] text-white/40 leading-relaxed">
        이 샘플 JSON은 변수 추천(Variable Picker)과 테스트 실행(Run Test) 시
        기본 시뮬레이션 데이터로 사용됩니다.
      </p>
    </div>
  )
}

interface HeaderRow {
  id: string
  key: string
  value: string
}

const buildInitialTestInput = (
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Record<string, unknown> => {
  const visited = new Set<string>()
  const upstreamNodes: Node[] = []
  const queue: string[] = []

  for (const edge of edges) {
    if (edge.target === currentNodeId) {
      queue.push(edge.source)
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const found = nodes.find((n) => n.id === id)
    if (found) {
      upstreamNodes.push(found)
      for (const edge of edges) {
        if (edge.target === id && !visited.has(edge.source)) {
          queue.push(edge.source)
        }
      }
    }
  }

  const orderedUpstream = [...upstreamNodes].reverse()
  const seed: Record<string, unknown> = {}

  const applyTriggerSeed = (node: Node) => {
    const cfg = node.data?.config as
      | TriggerNodeConfig
      | WebhookTriggerNodeConfig
      | undefined
    if (cfg?.samplePayload && cfg.samplePayload.trim()) {
      try {
        const parsed = JSON.parse(cfg.samplePayload) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(seed, parsed as Record<string, unknown>)
          return
        }
      } catch {
        // Fallback below
      }
    }
    if (node.type === 'trigger-webhook') {
      Object.assign(seed, {
        subject: 'Sample Webhook',
        status: 'success',
        amount: 25000,
      })
    } else {
      Object.assign(seed, {
        subject: 'Test Email Subject',
        from: 'test@example.com',
        body: 'This is a sample email body.',
      })
    }
  }

  const hasUpstreamTrigger = orderedUpstream.some((n) =>
    n.type?.startsWith('trigger')
  )
  if (!hasUpstreamTrigger) {
    const anyTrigger = nodes.find((n) => n.type?.startsWith('trigger'))
    if (anyTrigger) applyTriggerSeed(anyTrigger)
  }

  for (const node of orderedUpstream) {
    const type = node.type
    const cfg = node.data?.config as NodeConfig | undefined
    if (type === 'trigger' || type === 'trigger-webhook') {
      applyTriggerSeed(node)
    } else if (type === 'action-http') {
      const httpCfg = cfg as HttpActionConfig | undefined
      const outVar = httpCfg?.outputVariable?.trim() || 'http_response'
      const statusVar = httpCfg?.statusVariable?.trim() || 'http_status'
      seed[statusVar] = 200
      if (httpCfg?.sampleResponse) {
        try {
          seed[outVar] = JSON.parse(httpCfg.sampleResponse)
        } catch {
          seed[outVar] = { ok: true }
        }
      } else {
        seed[outVar] = { ok: true }
      }
      if (httpCfg?.responseMapping) {
        for (const m of httpCfg.responseMapping) {
          if (
            m.targetVariable?.trim() &&
            seed[m.targetVariable] === undefined
          ) {
            seed[m.targetVariable.trim()] = 'sample_value'
          }
        }
      }
    } else if (
      type === 'action-regex-replace' ||
      type === 'action-url-decode' ||
      type === 'action-ai'
    ) {
      const outVar = (
        cfg as
          | RegexReplaceActionConfig
          | UrlDecodeActionConfig
          | AiGenerateActionConfig
          | undefined
      )?.outputVariable
      if (outVar) seed[outVar] = 'sample_output'
    } else if (type === 'condition-ai') {
      const reasonVar = (cfg as AiConditionConfig | undefined)
        ?.reasoningVariable
      if (reasonVar) seed[reasonVar] = 'Sample AI reasoning'
    }
  }

  return seed
}

const suggestVarNameFromPath = (path: string): string => {
  const clean = path
    .replace(/\[(\d+)\]/g, '_$1')
    .replace(/[^a-zA-Z0-9_.]/g, '_')
  const parts = clean.split('.').filter(Boolean)
  const selected = parts.length > 2 ? parts.slice(-2) : parts
  return (
    selected
      .join('_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'extracted_var'
  )
}

interface HttpRequestConfigFieldsProps {
  nodeId: string
  httpConfig: HttpActionConfig
  nodes: Node[]
  edges: Edge[]
  onChangeField: (
    key: string,
    value: string | number | boolean | object | ConditionRule[]
  ) => void
}

const HttpRequestConfigFields: React.FC<HttpRequestConfigFieldsProps> = ({
  nodeId,
  httpConfig,
  nodes,
  edges,
  onChangeField,
}) => {
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([])
  const method = httpConfig.method || 'GET'
  const mappings = httpConfig.responseMapping || []

  useEffect(() => {
    const entries = Object.entries(httpConfig.headers || {})
    setHeaderRows(
      entries.map(([key, value], idx) => ({
        id: `${nodeId}-hdr-${idx}`,
        key,
        value,
      }))
    )
    // Re-sync header rows only when switching nodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  const syncHeadersToConfig = (rows: HeaderRow[]) => {
    const nextHeaders: Record<string, string> = {}
    for (const row of rows) {
      const trimmedKey = row.key.trim()
      if (trimmedKey) {
        nextHeaders[trimmedKey] = row.value
      }
    }
    onChangeField('headers', nextHeaders)
  }

  const addHeaderRow = () => {
    const next = [
      ...headerRows,
      { id: `${nodeId}-hdr-${Date.now()}`, key: '', value: '' },
    ]
    setHeaderRows(next)
  }

  const updateHeaderRow = (
    idx: number,
    field: 'key' | 'value',
    val: string
  ) => {
    const next = headerRows.map((r, i) =>
      i === idx ? { ...r, [field]: val } : r
    )
    setHeaderRows(next)
    syncHeadersToConfig(next)
  }

  const removeHeaderRow = (idx: number) => {
    const next = headerRows.filter((_, i) => i !== idx)
    setHeaderRows(next)
    syncHeadersToConfig(next)
  }

  const addMapping = () => {
    onChangeField('responseMapping', [
      ...mappings,
      { sourcePath: '', targetVariable: '' },
    ])
  }

  const updateMapping = (
    idx: number,
    field: keyof HttpResponseMapping,
    val: string
  ) => {
    const next = mappings.map((m, i) =>
      i === idx ? { ...m, [field]: val } : m
    )
    onChangeField('responseMapping', next)
  }

  const removeMapping = (idx: number) => {
    onChangeField(
      'responseMapping',
      mappings.filter((_, i) => i !== idx)
    )
  }

  let bodyJsonState: 'empty' | 'valid' | 'template' = 'empty'
  if (httpConfig.body && httpConfig.body.trim()) {
    try {
      JSON.parse(httpConfig.body)
      bodyJsonState = 'valid'
    } catch {
      bodyJsonState = 'template'
    }
  }

  return (
    <>
      <h3 className="font-bold text-lg text-[#00F5A0] border-b border-white/10 pb-2">
        HTTP Request
      </h3>

      <div className="flex flex-col mb-4">
        <label className="mb-2 text-sm font-medium text-white/80">Method</label>
        <select
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#00F5A0]"
          value={method}
          onChange={(e) => onChangeField('method', e.target.value)}
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
        value={httpConfig.url || ''}
        onChange={(e) => onChangeField('url', e.target.value)}
        placeholder="https://api.example.com/v1/resource?id={{trigger.id}}"
      />
      <VariablePicker
        currentNodeId={nodeId}
        nodes={nodes}
        edges={edges}
        onSelect={(v) => onChangeField('url', (httpConfig.url || '') + v)}
      />

      {/* Request Headers */}
      <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white/80">
            Request Headers
          </label>
          <button
            type="button"
            onClick={addHeaderRow}
            className="text-xs text-[#00F5A0] hover:underline font-medium"
          >
            + Add Header
          </button>
        </div>
        {headerRows.length === 0 ? (
          <p className="text-[11px] text-white/40 italic">
            설정된 헤더가 없습니다. (예: Authorization, Content-Type)
          </p>
        ) : (
          <div className="space-y-2">
            {headerRows.map((row, idx) => (
              <div key={row.id} className="flex gap-1.5 items-center">
                <input
                  className="w-2/5 px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                  value={row.key}
                  onChange={(e) => updateHeaderRow(idx, 'key', e.target.value)}
                  placeholder="Header Key"
                />
                <input
                  className="w-3/5 px-2.5 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                  value={row.value}
                  onChange={(e) =>
                    updateHeaderRow(idx, 'value', e.target.value)
                  }
                  placeholder="Value (or {{var}})"
                />
                <button
                  type="button"
                  onClick={() => removeHeaderRow(idx)}
                  className="text-[#FF2E63] hover:text-red-400 text-lg font-bold px-1"
                  title="Remove header"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Body */}
      {method !== 'GET' && (
        <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
          <label className="mb-2 text-sm font-medium text-white/80">
            Request Body (JSON / Text)
          </label>
          <textarea
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] h-28 text-xs font-mono leading-normal"
            value={httpConfig.body || ''}
            onChange={(e) => onChangeField('body', e.target.value)}
            placeholder={`{\n  "subject": "{{trigger.subject}}",\n  "amount": "{{trigger.amount}}"\n}`}
          />
          {bodyJsonState === 'valid' && (
            <span className="mt-1 text-[10px] text-[#00F5A0]">
              ✓ Valid JSON
            </span>
          )}
          {bodyJsonState === 'template' && (
            <span className="mt-1 text-[10px] text-white/50">
              Template / Raw text body (변수가 문자열/JSON으로 치환됩니다)
            </span>
          )}
          <VariablePicker
            currentNodeId={nodeId}
            nodes={nodes}
            edges={edges}
            onSelect={(v) => onChangeField('body', (httpConfig.body || '') + v)}
          />
        </div>
      )}

      {/* Output Variables */}
      <div className="flex flex-col mt-4 pt-4 border-t border-white/10 space-y-3">
        <label className="text-sm font-bold text-[#00F5A0]">
          출력 변수 설정 (Output Variables)
        </label>
        <Input
          label="Response Output Variable"
          value={httpConfig.outputVariable || ''}
          onChange={(e) => onChangeField('outputVariable', e.target.value)}
          placeholder="http_response (전체 응답 JSON이 저장되는 변수명)"
        />
        <Input
          label="Status Code Variable"
          value={httpConfig.statusVariable || ''}
          onChange={(e) => onChangeField('statusVariable', e.target.value)}
          placeholder="http_status (HTTP 상태 코드 200, 201 등)"
        />
      </div>

      {/* Response JSON Mapping */}
      <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-bold text-[#00F5A0]">
            JSON 응답 필드 매핑 (Response Mapping)
          </label>
          <button
            type="button"
            onClick={addMapping}
            className="text-xs text-[#00F5A0] hover:underline font-medium"
          >
            + Add Mapping
          </button>
        </div>
        <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
          응답 JSON의 특정 경로를 꺼내어 후속 노드(Condition, Discord 등)에서
          {' {{변수명}} '}으로 바로 사용할 수 있습니다.
        </p>

        {mappings.length === 0 ? (
          <p className="text-[11px] text-white/40 italic">
            매핑 규칙이 없습니다. 아래 테스트 실행 후 응답 필드를 클릭해
            추가하거나 직접 입력하세요.
          </p>
        ) : (
          <div className="space-y-2">
            {mappings.map((m, idx) => (
              <div
                key={idx}
                className="flex gap-1.5 items-center bg-white/[0.02] p-2 border border-white/10 rounded-xl"
              >
                <input
                  className="w-1/2 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                  value={m.sourcePath}
                  onChange={(e) =>
                    updateMapping(idx, 'sourcePath', e.target.value)
                  }
                  placeholder="Path (e.g. data.user.id)"
                />
                <span className="text-white/40 text-xs">→</span>
                <input
                  className="w-1/2 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00F5A0]"
                  value={m.targetVariable}
                  onChange={(e) =>
                    updateMapping(idx, 'targetVariable', e.target.value)
                  }
                  placeholder="Variable (e.g. user_id)"
                />
                <button
                  type="button"
                  onClick={() => removeMapping(idx)}
                  className="text-[#FF2E63] hover:text-red-400 text-lg font-bold px-1"
                  title="Remove mapping"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

interface SingleNodeTestSectionProps {
  workflowId: string
  nodeId: string
  nodeType: string
  config: NodeConfig
  nodes: Node[]
  edges: Edge[]
  onAddHttpMapping?: (sourcePath: string, targetVariable: string) => void
  onCaptureHttpSample?: (sampleResponseJson: string) => void
}

const SingleNodeTestSection: React.FC<SingleNodeTestSectionProps> = ({
  workflowId,
  nodeId,
  nodeType,
  config,
  nodes,
  edges,
  onAddHttpMapping,
  onCaptureHttpSample,
}) => {
  const [inputJson, setInputJson] = useState('{}')
  const [showInputEditor, setShowInputEditor] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<SingleNodeTestResponse | null>(
    null
  )
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    const initial = buildInitialTestInput(nodeId, nodes, edges)
    setInputJson(JSON.stringify(initial, null, 2))
    setTestResult(null)
    setRequestError(null)
    // Reset test payload when switching selected node
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  let inputJsonError: string | null = null
  try {
    JSON.parse(inputJson)
  } catch (err: unknown) {
    inputJsonError = err instanceof Error ? err.message : 'Invalid JSON'
  }

  const handleResetInput = () => {
    const initial = buildInitialTestInput(nodeId, nodes, edges)
    setInputJson(JSON.stringify(initial, null, 2))
  }

  const handleRunBlockTest = async () => {
    if (inputJsonError) return
    setIsTesting(true)
    setRequestError(null)
    setTestResult(null)

    try {
      const parsedInput = JSON.parse(inputJson) as Record<string, unknown>
      const currentNode = nodes.find((n) => n.id === nodeId)
      const res = await api.post<SingleNodeTestResponse>(
        `/workflows/${workflowId}/test-node`,
        {
          node: {
            id: nodeId,
            type: nodeType,
            data: {
              label: currentNode?.data?.label || nodeType,
              config,
            },
          },
          inputData: parsedInput,
        }
      )
      setTestResult(res)

      if (
        nodeType === 'action-http' &&
        res.result?.success &&
        onCaptureHttpSample
      ) {
        const httpCfg = config as HttpActionConfig
        const outVar = httpCfg.outputVariable?.trim() || 'http_response'
        const rawPayload =
          res.result.extractedVariables?.[outVar] ?? res.result.data
        if (rawPayload !== undefined) {
          try {
            onCaptureHttpSample(JSON.stringify(rawPayload, null, 2))
          } catch {
            // Ignore non-serializable payload
          }
        }
      }
    } catch (err: unknown) {
      setRequestError(
        err instanceof Error ? err.message : '블록 단독 실행에 실패했습니다.'
      )
    } finally {
      setIsTesting(false)
    }
  }

  const httpResponsePaths: string[] = (() => {
    if (
      nodeType !== 'action-http' ||
      !testResult?.result?.success ||
      !onAddHttpMapping
    ) {
      return []
    }
    const httpCfg = config as HttpActionConfig
    const outVar = httpCfg.outputVariable?.trim() || 'http_response'
    const rawPayload =
      testResult.result.extractedVariables?.[outVar] ?? testResult.result.data
    if (rawPayload && typeof rawPayload === 'object') {
      return extractJsonPaths(rawPayload).slice(0, 24)
    }
    return []
  })()

  return (
    <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#8A3FFC] uppercase tracking-wider">
          ⚡ 블록 단독 테스트 (Test Block)
        </span>
        <button
          type="button"
          onClick={() => setShowInputEditor((v) => !v)}
          className="text-[11px] text-white/60 hover:text-white underline"
        >
          {showInputEditor ? '입력 변수 접기' : '입력 변수 편집'}
        </button>
      </div>

      {showInputEditor && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50">
              테스트 입력 컨텍스트 (JSON)
            </span>
            <button
              type="button"
              onClick={handleResetInput}
              className="text-[10px] text-[#8A3FFC] hover:text-[#E02DFF]"
            >
              ↻ 상위 샘플 불러오기
            </button>
          </div>
          <textarea
            className="w-full h-28 px-3 py-2 bg-[#0D0E12]/70 border border-white/10 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-[#8A3FFC]"
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
          />
          {inputJsonError && (
            <p className="text-[10px] text-[#FF2E63]">✗ {inputJsonError}</p>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={isTesting || !!inputJsonError}
        onClick={handleRunBlockTest}
        className="w-full text-xs bg-[#8A3FFC]/20 hover:bg-[#8A3FFC]/35 border border-[#8A3FFC]/40 text-white"
      >
        {isTesting ? '실행 중...' : '▶ 이 블록 실행해보기'}
      </Button>

      {requestError && (
        <div className="p-3 bg-[#FF2E63]/10 border border-[#FF2E63]/30 rounded-xl text-xs text-[#FF2E63]">
          {requestError}
        </div>
      )}

      {testResult && (
        <div className="p-3 bg-[#0D0E12]/80 border border-white/10 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                testResult.status === 'SUCCESS'
                  ? 'bg-[#00F5A0]/20 text-[#00F5A0]'
                  : 'bg-[#FF2E63]/20 text-[#FF2E63]'
              }`}
            >
              {testResult.status}
            </span>
            <span className="text-[11px] text-white/70 truncate max-w-[200px]">
              {testResult.result?.message || testResult.message}
            </span>
          </div>

          {testResult.result?.extractedVariables &&
            Object.keys(testResult.result.extractedVariables).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/50 uppercase mb-1">
                  Extracted Variables
                </p>
                <pre className="p-2 bg-black/40 rounded-lg text-[10px] text-[#00F5A0] font-mono overflow-x-auto max-h-28 overflow-y-auto">
                  {JSON.stringify(
                    testResult.result.extractedVariables,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

          {testResult.result?.data && (
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase mb-1">
                Output Data
              </p>
              <pre className="p-2 bg-black/40 rounded-lg text-[10px] text-white/80 font-mono overflow-x-auto max-h-36 overflow-y-auto">
                {JSON.stringify(testResult.result.data, null, 2)}
              </pre>
            </div>
          )}

          {httpResponsePaths.length > 0 && onAddHttpMapping && (
            <div className="pt-2 border-t border-white/10">
              <p className="text-[10px] font-bold text-[#00F5A0] mb-1.5">
                클릭하여 JSON 경로 매핑 추가:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {httpResponsePaths.map((path) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() =>
                      onAddHttpMapping(path, suggestVarNameFromPath(path))
                    }
                    className="px-2 py-0.5 bg-white/5 hover:bg-[#00F5A0]/20 border border-white/10 hover:border-[#00F5A0]/50 rounded-md text-[10px] text-white/80 hover:text-white font-mono transition-all"
                  >
                    + {path}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  workflowId,
  triggerId,
  onSaveWorkflow,
  triggerType: _triggerType,
  triggerConfig: _triggerConfig,
}) => {
  const [config, setConfig] = useState<NodeConfig>(
    initialConfig || ({} as NodeConfig)
  )
  const configRef = useRef<NodeConfig>(initialConfig || ({} as NodeConfig))
  const { nodes, edges } = useWorkflowStore()
  const [selectedSampleType, setSelectedSampleType] = useState<
    'curl' | 'node' | 'java' | 'gas_simple' | 'gas_gmail'
  >('curl')
  const [allowedIpsText, setAllowedIpsText] = useState('')
  const [allowedOriginsText, setAllowedOriginsText] = useState('')

  useEffect(() => {
    if (nodeType === 'trigger-webhook') {
      const whConfig = (initialConfig || {}) as WebhookTriggerNodeConfig
      const ips = Array.isArray(whConfig.allowedIps)
        ? whConfig.allowedIps.join('\n')
        : whConfig.allowedIps || ''
      const origins = Array.isArray(whConfig.allowedOrigins)
        ? whConfig.allowedOrigins.join('\n')
        : whConfig.allowedOrigins || ''
      setAllowedIpsText(ips)
      setAllowedOriginsText(origins)
    }
  }, [nodeId, initialConfig, nodeType])

  useEffect(() => {
    // Only update if the config or node really changed
    if (JSON.stringify(initialConfig) !== JSON.stringify(configRef.current)) {
      const next = initialConfig || ({} as NodeConfig)
      configRef.current = next
      setConfig(next)
    }
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

  const handlePatchConfig = (partial: Record<string, unknown>) => {
    const next = { ...configRef.current, ...partial } as NodeConfig
    configRef.current = next
    setConfig(next)
    onSave(next)
  }

  const handleChange = (
    key: string,
    value: string | number | boolean | object | ConditionRule[]
  ) => {
    handlePatchConfig({ [key]: value })
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
        {/* Node Description/Memo */}
        <div className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-xl mb-2">
          <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
            Description / Memo
          </label>
          <textarea
            className="px-3 py-2 bg-[#0D0E12]/50 border border-white/10 rounded-lg text-white placeholder-white/30 text-xs focus:outline-none focus:ring-1 focus:ring-[#8A3FFC] h-16 resize-none transition-all leading-normal"
            value={config.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What does this node do? (e.g. Filter spam emails)"
          />
        </div>

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
                <TriggerSamplePayloadField
                  nodeType={nodeType}
                  value={(config as TriggerNodeConfig).samplePayload || ''}
                  onChange={(val) => handleChange('samplePayload', val)}
                />
              </>
            )}
            {nodeType === 'trigger-webhook' && (
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Webhook URL
                  </label>
                  {(() => {
                    const webhookToken = (config as WebhookTriggerNodeConfig)
                      .webhookToken
                    const url = webhookToken
                      ? `${window.location.origin}/api/webhook/${webhookToken}`
                      : triggerId && userId
                        ? `${window.location.origin}/api/webhook/${userId}/${triggerId}`
                        : null

                    if (url) {
                      return (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none"
                            value={url}
                          />
                          <Button
                            variant="secondary"
                            type="button"
                            className="!px-3 !py-1 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(url)
                              alert('Webhook URL copied!')
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      )
                    }

                    return (
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
                    )
                  })()}
                </div>
                <TriggerSamplePayloadField
                  nodeType={nodeType}
                  value={
                    (config as WebhookTriggerNodeConfig).samplePayload || ''
                  }
                  onChange={(val) => handleChange('samplePayload', val)}
                />
                {((config as WebhookTriggerNodeConfig).webhookToken ||
                  (triggerId && userId)) && (
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

                    {/* Source Security / Whitelist */}
                    <div className="flex flex-col mt-4 pt-4 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-[#00F5A0] flex items-center gap-1.5">
                          <span>🛡️ 요청 출처 및 주소 제한</span>
                        </label>
                        <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                          미입력 시 전체 허용
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">
                        요청을 보낸 주소(IP)나 도메인(Origin)을 검증하여 허용된
                        요청만 처리합니다. 입력하지 않으면 모든 출처에서의
                        요청이 전체 허용됩니다.
                      </p>

                      <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium text-white/80">
                          허용 IP 주소 목록 (Allowed IPs)
                        </label>
                        <textarea
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] h-20 text-xs font-mono transition-all duration-200"
                          value={allowedIpsText}
                          onChange={(e) => {
                            const val = e.target.value
                            setAllowedIpsText(val)
                            const list = val
                              .split(/[\n,]+/)
                              .map((s) => s.trim())
                              .filter(Boolean)
                            handleChange('allowedIps', list)
                          }}
                          placeholder={`예시:\n192.168.1.100\n10.0.0.0/24 (CIDR)\n127.0.0.1`}
                        />
                        <p className="mt-1 text-[10px] text-white/40">
                          개별 IP, CIDR 서브넷 대역, 와일드카드(192.168.1.*)를
                          줄바꿈으로 입력하세요.
                        </p>
                      </div>

                      <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium text-white/80">
                          허용 Origin / 도메인 (Allowed Origins - 선택)
                        </label>
                        <textarea
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] h-20 text-xs font-mono transition-all duration-200"
                          value={allowedOriginsText}
                          onChange={(e) => {
                            const val = e.target.value
                            setAllowedOriginsText(val)
                            const list = val
                              .split(/[\n,]+/)
                              .map((s) => s.trim())
                              .filter(Boolean)
                            handleChange('allowedOrigins', list)
                          }}
                          placeholder={`예시:\nhttps://hooks.stripe.com\nhttps://github.com\n*.mycompany.com`}
                        />
                        <p className="mt-1 text-[10px] text-white/40">
                          웹 서비스나 프론트엔드에서 보낸 Origin 또는 Referer
                          도메인을 제한할 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col mt-4 pt-4 border-t border-white/10">
                      <label className="mb-2 text-sm font-medium text-white/80">
                        Sample Request Code
                      </label>
                      <select
                        className="w-full px-4 py-2 mb-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#8A3FFC] focus:border-transparent transition-all duration-200"
                        value={selectedSampleType}
                        onChange={(e) =>
                          setSelectedSampleType(
                            e.target.value as
                              | 'curl'
                              | 'node'
                              | 'java'
                              | 'gas_simple'
                              | 'gas_gmail'
                          )
                        }
                      >
                        <option value="curl" className="bg-[#0D0E12]">
                          cURL (Command Line)
                        </option>
                        <option value="node" className="bg-[#0D0E12]">
                          Node.js (Fetch API)
                        </option>
                        <option value="java" className="bg-[#0D0E12]">
                          Java (HttpClient)
                        </option>
                        <option value="gas_simple" className="bg-[#0D0E12]">
                          Google Apps Script (Simple Fetch)
                        </option>
                        <option value="gas_gmail" className="bg-[#0D0E12]">
                          Google Apps Script (Gmail Sync)
                        </option>
                      </select>

                      {selectedSampleType === 'gas_gmail' && (
                        <p className="text-[10px] text-white/50 mb-2 leading-relaxed">
                          Copy this script into your Google Apps Script, set up
                          a 1-minute time-driven trigger. It will monitor Gmail
                          in real-time and post unread emails to this webhook,
                          marking them read.
                        </p>
                      )}
                      {selectedSampleType === 'gas_simple' && (
                        <p className="text-[10px] text-white/50 mb-2 leading-relaxed">
                          A simple Google Apps Script function to fetch and send
                          data to this webhook trigger.
                        </p>
                      )}
                      {selectedSampleType === 'node' && (
                        <p className="text-[10px] text-white/50 mb-2 leading-relaxed">
                          A modern JavaScript example using Fetch API to send a
                          POST request.
                        </p>
                      )}
                      {selectedSampleType === 'java' && (
                        <p className="text-[10px] text-white/50 mb-2 leading-relaxed">
                          A Java 11+ example using the built-in HttpClient to
                          send a POST request.
                        </p>
                      )}

                      <div className="relative">
                        <pre className="p-3 bg-[#0D0E12]/80 border border-[#0D0E12] rounded-xl text-[9px] text-[#00F5A0] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-normal max-h-56 overflow-y-auto pr-12">
                          {(() => {
                            const webhookToken = (
                              config as WebhookTriggerNodeConfig
                            ).webhookToken
                            const webhookUrl = webhookToken
                              ? `${window.location.origin}/api/webhook/${webhookToken}`
                              : `${window.location.origin}/api/webhook/${userId}/${triggerId}`
                            const apiKey =
                              (config as WebhookTriggerNodeConfig).apiKey ||
                              '<API_KEY>'

                            switch (selectedSampleType) {
                              case 'curl':
                                return `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "subject": "Test Webhook",
    "amount": 25000,
    "status": "pending"
  }'`
                              case 'node':
                                return `const webhookUrl = "${webhookUrl}";
const apiKey = "${apiKey}";

const payload = {
  subject: "Test Webhook",
  amount: 25000,
  status: "pending"
};

fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${apiKey}\`
  },
  body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => console.log("Success:", data))
.catch(error => console.error("Error:", error));`
                              case 'java':
                                return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WebhookSender {
    public static void main(String[] args) {
        String webhookUrl = "${webhookUrl}";
        String apiKey = "${apiKey}";
        String jsonPayload = "{\\"subject\\": \\"Test Webhook\\", \\"amount\\": 25000, \\"status\\": \\"pending\\"}";

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("Response Status Code: " + response.statusCode());
            System.out.println("Response Body: " + response.body());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}`
                              case 'gas_simple':
                                return `function sendWebhook() {
  const webhookUrl = "${webhookUrl}";
  const apiKey = "${(config as WebhookTriggerNodeConfig).apiKey || ''}";
  
  const payload = {
    subject: "Test Webhook",
    amount: 25000,
    status: "pending"
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
    const response = UrlFetchApp.fetch(webhookUrl, options);
    Logger.log("Response Code: " + response.getResponseCode());
    Logger.log("Response Body: " + response.getContentText());
  } catch (e) {
    Logger.log("Error sending webhook: " + e.toString());
  }
}`
                              case 'gas_gmail':
                                return `function monitorGmail() {
  const query = "is:unread";
  const webhookUrl = "${webhookUrl}";
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
                              default:
                                return ''
                            }
                          })()}
                        </pre>
                        <Button
                          variant="secondary"
                          type="button"
                          className="absolute right-2 top-2 !px-2 !py-0.5 text-[9px]"
                          onClick={() => {
                            const webhookToken = (
                              config as WebhookTriggerNodeConfig
                            ).webhookToken
                            const webhookUrl = webhookToken
                              ? `${window.location.origin}/api/webhook/${webhookToken}`
                              : `${window.location.origin}/api/webhook/${userId}/${triggerId}`
                            const apiKey =
                              (config as WebhookTriggerNodeConfig).apiKey ||
                              '<API_KEY>'
                            let codeText = ''

                            switch (selectedSampleType) {
                              case 'curl':
                                codeText = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "subject": "Test Webhook",
    "amount": 25000,
    "status": "pending"
  }'`
                                break
                              case 'node':
                                codeText = `const webhookUrl = "${webhookUrl}";
const apiKey = "${apiKey}";

const payload = {
  subject: "Test Webhook",
  amount: 25000,
  status: "pending"
};

fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${apiKey}\`
  },
  body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => console.log("Success:", data))
.catch(error => console.error("Error:", error));`
                                break
                              case 'java':
                                codeText = `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WebhookSender {
    public static void main(String[] args) {
        String webhookUrl = "${webhookUrl}";
        String apiKey = "${apiKey}";
        String jsonPayload = "{\\"subject\\": \\"Test Webhook\\", \\"amount\\": 25000, \\"status\\": \\"pending\\"}";

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("Response Status Code: " + response.statusCode());
            System.out.println("Response Body: " + response.body());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}`
                                break
                              case 'gas_simple':
                                codeText = `function sendWebhook() {
  const webhookUrl = "${webhookUrl}";
  const apiKey = "${(config as WebhookTriggerNodeConfig).apiKey || ''}";
  
  const payload = {
    subject: "Test Webhook",
    amount: 25000,
    status: "pending"
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
    const response = UrlFetchApp.fetch(webhookUrl, options);
    Logger.log("Response Code: " + response.getResponseCode());
    Logger.log("Response Body: " + response.getContentText());
  } catch (e) {
    Logger.log("Error sending webhook: " + e.toString());
  }
}`
                                break
                              case 'gas_gmail':
                                codeText = `function monitorGmail() {
  const query = "is:unread";
  const webhookUrl = "${webhookUrl}";
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
                                break
                            }

                            navigator.clipboard.writeText(codeText)
                            alert('Sample code copied to clipboard!')
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
              nodeId={nodeId}
              nodes={nodes}
              edges={edges}
            />
          </>
        )}

        {nodeType === 'action-http' && (
          <HttpRequestConfigFields
            nodeId={nodeId}
            httpConfig={config as HttpActionConfig}
            nodes={nodes}
            edges={edges}
            onChangeField={handleChange}
          />
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
                <VariablePicker
                  currentNodeId={nodeId}
                  nodes={nodes}
                  edges={edges}
                  onSelect={(v) =>
                    handleChange('inputText', (regexConfig.inputText || '') + v)
                  }
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
                  <VariablePicker
                    currentNodeId={nodeId}
                    nodes={nodes}
                    edges={edges}
                    onSelect={(v) => {
                      const currentVal =
                        typeof googleConfig.payload === 'object'
                          ? JSON.stringify(googleConfig.payload, null, 2)
                          : (googleConfig.payload as string) || ''
                      const newVal = currentVal + v
                      try {
                        handleChange('payload', JSON.parse(newVal))
                      } catch {
                        handleChange('payload', newVal)
                      }
                    }}
                  />
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
                <VariablePicker
                  currentNodeId={nodeId}
                  nodes={nodes}
                  edges={edges}
                  onSelect={(v) =>
                    handleChange('inputText', (urlConfig.inputText || '') + v)
                  }
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
                currentNodeId={nodeId}
                nodes={nodes}
                edges={edges}
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

        {nodeType === 'action-ai' &&
          (() => {
            const aiConfig = config as AiGenerateActionConfig
            return (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-bold text-lg text-[#00F5A0]">
                    AI Generation (LLM)
                  </h3>
                  <span className="text-[11px] bg-[#8A3FFC]/20 text-[#8A3FFC] px-2.5 py-0.5 rounded-full border border-[#8A3FFC]/30 font-medium">
                    OpenAI / AGY
                  </span>
                </div>

                <Input
                  label="API Base URL (Optional - AGY / Custom / OpenAI)"
                  value={aiConfig.baseUrl || ''}
                  onChange={(e) => handleChange('baseUrl', e.target.value)}
                  placeholder="Default: https://api.openai.com/v1 (or http://localhost:8080/v1)"
                />
                <p className="text-[11px] text-white/40 -mt-2 mb-3 leading-relaxed">
                  OpenAI 규격 호환 엔드포인트(Groq, Ollama, OpenRouter) 또는
                  자체 개발한 agy API 주소를 입력할 수 있습니다.
                </p>

                <Input
                  label="API Key (Optional for local AGY)"
                  type="password"
                  value={aiConfig.apiKey || ''}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="sk-... (로컬/자체 agy API일 경우 생략 가능)"
                />

                <Input
                  label="Model Name"
                  value={aiConfig.model || ''}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="Default: gpt-4o-mini (or your agy model name)"
                />

                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    System Instructions (Optional)
                  </label>
                  <textarea
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-20 transition-all duration-200"
                    value={aiConfig.systemPrompt || ''}
                    onChange={(e) =>
                      handleChange('systemPrompt', e.target.value)
                    }
                    placeholder="예: 당신은 고객 지원 전문 AI 요약 어시스턴트입니다."
                  />
                  <VariablePicker
                    currentNodeId={nodeId}
                    nodes={nodes}
                    edges={edges}
                    onSelect={(v) =>
                      handleChange(
                        'systemPrompt',
                        (aiConfig.systemPrompt || '') + v
                      )
                    }
                  />
                </div>

                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    User Prompt (Required)
                  </label>
                  <textarea
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-28 transition-all duration-200"
                    value={aiConfig.prompt || ''}
                    onChange={(e) => handleChange('prompt', e.target.value)}
                    placeholder="예: 다음 내용을 3줄로 핵심 요약해줘: {{trigger.body}}"
                  />
                  <VariablePicker
                    currentNodeId={nodeId}
                    nodes={nodes}
                    edges={edges}
                    onSelect={(v) =>
                      handleChange('prompt', (aiConfig.prompt || '') + v)
                    }
                  />
                </div>

                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Response Format
                  </label>
                  <select
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#00F5A0]"
                    value={aiConfig.responseFormat || 'text'}
                    onChange={(e) =>
                      handleChange('responseFormat', e.target.value)
                    }
                  >
                    <option value="text" className="bg-[#0D0E12]">
                      Plain Text
                    </option>
                    <option value="json" className="bg-[#0D0E12]">
                      JSON Object
                    </option>
                  </select>
                </div>

                <Input
                  label="Output Variable Name (Required)"
                  value={aiConfig.outputVariable || ''}
                  onChange={(e) =>
                    handleChange('outputVariable', e.target.value)
                  }
                  placeholder="e.g. ai_summary (이후 노드에서 {{ai_summary}} 로 사용 가능)"
                />
              </>
            )
          })()}

        {nodeType === 'condition-ai' &&
          (() => {
            const aiCondConfig = config as AiConditionConfig
            return (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-bold text-lg text-[#00F5A0]">
                    AI Condition (LLM)
                  </h3>
                  <span className="text-[11px] bg-[#00F5A0]/20 text-[#00F5A0] px-2.5 py-0.5 rounded-full border border-[#00F5A0]/30 font-medium">
                    지능형 조건 분기
                  </span>
                </div>

                <p className="text-xs text-white/60 mb-2 leading-relaxed">
                  입력된 자연어 데이터와 평가 기준을 AI가 분석하여 워크플로우를{' '}
                  <span className="text-[#00F5A0] font-bold">True</span> 또는{' '}
                  <span className="text-[#FF2E63] font-bold">False</span> 경로로
                  분기합니다.
                </p>

                <Input
                  label="API Base URL (Optional - AGY / Custom / OpenAI)"
                  value={aiCondConfig.baseUrl || ''}
                  onChange={(e) => handleChange('baseUrl', e.target.value)}
                  placeholder="Default: https://api.openai.com/v1 (or http://localhost:8080/v1)"
                />

                <Input
                  label="API Key (Optional for local AGY)"
                  type="password"
                  value={aiCondConfig.apiKey || ''}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="sk-... (로컬/자체 agy API일 경우 생략 가능)"
                />

                <Input
                  label="Model Name"
                  value={aiCondConfig.model || ''}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="Default: gpt-4o-mini (or your agy model name)"
                />

                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Input Text / Context (Required)
                  </label>
                  <textarea
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-24 transition-all duration-200"
                    value={aiCondConfig.inputText || ''}
                    onChange={(e) => handleChange('inputText', e.target.value)}
                    placeholder="예: {{trigger.subject}} - {{trigger.body}}"
                  />
                  <VariablePicker
                    currentNodeId={nodeId}
                    nodes={nodes}
                    edges={edges}
                    onSelect={(v) =>
                      handleChange(
                        'inputText',
                        (aiCondConfig.inputText || '') + v
                      )
                    }
                  />
                </div>

                <div className="flex flex-col mb-4">
                  <label className="mb-2 text-sm font-medium text-white/80">
                    Evaluation Criteria (Required)
                  </label>
                  <textarea
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00F5A0] focus:border-transparent h-24 transition-all duration-200"
                    value={aiCondConfig.criteria || ''}
                    onChange={(e) => handleChange('criteria', e.target.value)}
                    placeholder="예: 고객 문의가 긴급한 서비스 장애 또는 환불 요청에 해당하는가?"
                  />
                  <VariablePicker
                    currentNodeId={nodeId}
                    nodes={nodes}
                    edges={edges}
                    onSelect={(v) =>
                      handleChange(
                        'criteria',
                        (aiCondConfig.criteria || '') + v
                      )
                    }
                  />
                </div>

                <Input
                  label="Reasoning Output Variable (Optional)"
                  value={aiCondConfig.reasoningVariable || ''}
                  onChange={(e) =>
                    handleChange('reasoningVariable', e.target.value)
                  }
                  placeholder="e.g. ai_reason (AI의 판단 이유를 변수에 저장하여 후속 노드에서 활용)"
                />
              </>
            )
          })()}

        {!nodeType.startsWith('trigger') && workflowId && (
          <SingleNodeTestSection
            workflowId={workflowId}
            nodeId={nodeId}
            nodeType={nodeType}
            config={config}
            nodes={nodes}
            edges={edges}
            onAddHttpMapping={
              nodeType === 'action-http'
                ? (sourcePath, targetVariable) => {
                    const currHttp = configRef.current as HttpActionConfig
                    const existing = currHttp.responseMapping || []
                    const alreadyMapped = existing.some(
                      (m) => m.sourcePath === sourcePath
                    )
                    if (!alreadyMapped) {
                      handleChange('responseMapping', [
                        ...existing,
                        { sourcePath, targetVariable },
                      ])
                    }
                  }
                : undefined
            }
            onCaptureHttpSample={
              nodeType === 'action-http'
                ? (sampleResponseJson) =>
                    handleChange('sampleResponse', sampleResponseJson)
                : undefined
            }
          />
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
