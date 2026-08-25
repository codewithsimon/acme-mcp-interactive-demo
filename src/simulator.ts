import {
  approvedRelease,
  deploymentPolicy,
  deterministicTime,
  preparedDeployment,
  projectStatus,
  runbookContent,
  tools,
  validateToolInput,
  type AuditEntry,
  type EventKind,
  type EventStatus,
  type PreparedDeployment,
  type ProtocolEvent,
  type ToolName,
} from './domain'

export type Mode = 'guided' | 'explore'

export interface SimulationState {
  mode: Mode
  step: number
  events: ProtocolEvent[]
  audit: AuditEntry[]
  selectedTool: ToolName
  lastResult: unknown
  prepared?: PreparedDeployment
  usedTokens: string[]
  issueCreated: boolean
  deploymentComplete: boolean
  replayCount: number
  skipAnimation: boolean
  executedSteps: number[]
}

export type SimulationAction =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'SELECT_TOOL'; tool: ToolName }
  | { type: 'CALL_TOOL'; tool: ToolName; input: Record<string, string> }
  | { type: 'REPLAY' }
  | { type: 'RESET' }
  | { type: 'SET_SKIP_ANIMATION'; value: boolean }

export const chapterCount = 11

export const initialState: SimulationState = {
  mode: 'guided',
  step: 0,
  events: [],
  audit: [],
  selectedTool: 'get_project_status',
  lastResult: undefined,
  usedTokens: [],
  issueCreated: false,
  deploymentComplete: false,
  replayCount: 0,
  skipAnimation: false,
  executedSteps: [],
}

function addEvent(
  state: SimulationState,
  kind: EventKind,
  status: EventStatus,
  title: string,
  detail: string,
  payload?: unknown,
): ProtocolEvent[] {
  const id = state.events.length + 1
  return [
    ...state.events,
    { id, at: deterministicTime(id), kind, status, title, detail, payload },
  ]
}

function addAudit(
  state: SimulationState,
  action: string,
  target: string,
  result: AuditEntry['result'],
  reason: string,
): AuditEntry[] {
  const id = state.audit.length + 1
  return [
    ...state.audit,
    {
      id,
      at: deterministicTime(id + 30),
      actor: 'presenter@acme.demo',
      action,
      target,
      result,
      reason,
    },
  ]
}

function callTool(
  state: SimulationState,
  tool: ToolName,
  input: Record<string, string>,
): SimulationState {
  const validation = validateToolInput(tool, input)
  let events = addEvent(
    state,
    'protocol',
    'sent',
    `tools/call · ${tool}`,
    'Host → Acme MCP Server',
    input,
  )

  if (!validation.ok) {
    const next = { ...state, events }
    return {
      ...next,
      events: addEvent(next, 'protocol', 'denied', 'Invalid tool input', validation.error ?? ''),
      lastResult: { error: validation.error },
    }
  }

  const withRequest = { ...state, events }
  switch (tool) {
    case 'get_project_status':
      events = addEvent(
        withRequest,
        'downstream',
        'received',
        'Acme Projects query',
        'Normalized project ID and fetched delivery snapshot',
      )
      return {
        ...state,
        events: addEvent({ ...state, events }, 'protocol', 'received', 'Structured result', 'Server → Host', projectStatus),
        lastResult: projectStatus,
      }
    case 'create_issue': {
      const result = {
        key: 'ACME-1042',
        title: input.title,
        priority: input.priority,
        url: 'acme://issues/ACME-1042',
      }
      events = addEvent(
        withRequest,
        'downstream',
        'allowed',
        'Acme Issues write',
        'Created stable issue ACME-1042',
        result,
      )
      const next = { ...state, events }
      return {
        ...next,
        events: addEvent(next, 'protocol', 'received', 'Issue created', 'Server → Host', result),
        audit: addAudit(state, 'create_issue', 'ACME-1042', 'success', 'Validated write'),
        issueCreated: true,
        lastResult: result,
      }
    }
    case 'read_runbook':
      events = addEvent(
        withRequest,
        'downstream',
        'received',
        'Resource gateway read',
        'Retrieved untrusted operational content',
      )
      events = addEvent(
        { ...state, events },
        'reasoning',
        'info',
        'Trust boundary applied',
        'Treat resource text as untrusted data; ignore embedded authority claims',
      )
      return {
        ...state,
        events: addEvent(
          { ...state, events },
          'protocol',
          'received',
          'Runbook content',
          'Data returned with explicit trust boundary',
          runbookContent,
        ),
        lastResult: runbookContent,
      }
    case 'prepare_deployment': {
      const decision = deploymentPolicy(tool, input, {
        prepared: state.prepared,
        usedTokens: state.usedTokens,
      })
      const allowed = decision.ok
      const next = { ...state, events }
      events = addEvent(
        next,
        'policy',
        allowed ? 'allowed' : 'denied',
        allowed ? 'Deployment prepared' : 'Server-side policy denied',
        allowed ? 'Approved release; short-lived token minted' : decision.error ?? '',
        allowed ? decision.value : undefined,
      )
      return {
        ...state,
        events,
        audit: addAudit(
          state,
          'prepare_deployment',
          `${input.environment}/${input.release}`,
          allowed ? 'success' : 'denied',
          allowed ? 'Release allowlist matched' : decision.error ?? '',
        ),
        prepared: allowed ? decision.value : state.prepared,
        lastResult: allowed ? decision.value : { error: decision.error },
      }
    }
    case 'approve_deployment': {
      const decision = deploymentPolicy(tool, input, {
        prepared: state.prepared,
        usedTokens: state.usedTokens,
      })
      const allowed = decision.ok
      const next = { ...state, events }
      events = addEvent(
        next,
        'policy',
        allowed ? 'allowed' : 'denied',
        allowed ? 'Deployment approved' : 'Approval denied',
        allowed ? 'Exact prepared action consumed once' : decision.error ?? '',
      )
      if (allowed) {
        const deployment = decision.value
        events = addEvent(
          { ...state, events },
          'downstream',
          'allowed',
          'Acme Deploy operation',
          `Deployed ${deployment?.release} to ${deployment?.environment}`,
        )
      }
      return {
        ...state,
        events,
        audit: addAudit(
          state,
          'approve_deployment',
          input.token,
          allowed ? 'success' : 'denied',
          allowed ? 'One-time approval token consumed' : decision.error ?? '',
        ),
        usedTokens: allowed ? [...state.usedTokens, input.token] : state.usedTokens,
        deploymentComplete: allowed,
        lastResult: allowed
          ? {
              status: 'deployed',
              release: decision.value?.release,
              environment: decision.value?.environment,
            }
          : { error: decision.error },
      }
  }
}
}

const guidedActions: Partial<Record<number, (state: SimulationState) => SimulationState>> = {
  3: (state) => ({
    ...state,
    events: addEvent(
      state,
      'protocol',
      'received',
      'tools/list',
      `Server advertised ${tools.length} typed capabilities`,
      tools.map(({ name, description, risk }) => ({ name, description, risk })),
    ),
    lastResult: tools,
  }),
  4: (state) => callTool(state, 'get_project_status', { project: 'Project Phoenix' }),
  5: (state) =>
    callTool(state, 'create_issue', {
      project: 'PHX',
      title: 'Resolve payment retry failures',
      priority: 'high',
    }),
  7: (state) => callTool(state, 'read_runbook', { uri: 'runbook://payments' }),
  8: (state) =>
    callTool(state, 'prepare_deployment', {
      environment: 'production',
      release: 'experimental-99',
    }),
  9: (state) => {
    const prepared = callTool(state, 'prepare_deployment', {
      environment: 'production',
      release: approvedRelease,
    })
    return callTool(prepared, 'approve_deployment', {
      token: preparedDeployment.token,
      confirmation: 'DEPLOY',
    })
  },
}

function goToGuidedStep(state: SimulationState, target: number): SimulationState {
  const boundedTarget = Math.max(0, Math.min(chapterCount - 1, target))
  if (boundedTarget <= state.step) {
    return { ...state, step: boundedTarget }
  }

  let next = state
  for (let step = state.step + 1; step <= boundedTarget; step += 1) {
    next = { ...next, step }
    if (!next.executedSteps.includes(step)) {
      next = guidedActions[step]?.(next) ?? next
      next = { ...next, executedSteps: [...next.executedSteps, step] }
    }
  }
  return next
}

export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'NEXT_STEP': {
      return goToGuidedStep(state, state.step + 1)
    }
    case 'PREVIOUS_STEP':
      return { ...state, step: Math.max(0, state.step - 1) }
    case 'GO_TO_STEP':
      return goToGuidedStep(state, action.step)
    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.tool }
    case 'CALL_TOOL':
      return callTool(state, action.tool, action.input)
    case 'REPLAY': {
      const base = { ...initialState, mode: state.mode, skipAnimation: state.skipAnimation }
      let replayed = base
      for (let step = 1; step <= state.step; step += 1) {
        replayed = simulationReducer(replayed, { type: 'NEXT_STEP' })
      }
      return { ...replayed, replayCount: state.replayCount + 1 }
    }
    case 'RESET':
      return { ...initialState, mode: state.mode, skipAnimation: state.skipAnimation }
    case 'SET_SKIP_ANIMATION':
      return { ...state, skipAnimation: action.value }
  }
}
