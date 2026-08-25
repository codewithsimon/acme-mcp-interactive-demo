import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  approvedRelease,
  preparedDeployment,
  projectStatus,
  runbookContent,
  tools,
  type AuditEntry,
  type ProtocolEvent,
  type ToolDefinition,
} from './domain'
import { presenterActionForKey } from './presenter'
import {
  chapterCount,
  initialState,
  simulationReducer,
  type SimulationAction,
  type SimulationState,
} from './simulator'

const chapters = [
  ['A common language for AI tools', 'Model Context Protocol, explained through one deterministic Acme story'],
  ['Before MCP', 'Every host speaks a different dialect'],
  ['After MCP', 'One protocol boundary; many capabilities'],
  ['Discovery', 'The host asks what the server can do'],
  ['Structured context', 'Project Phoenix, without copy and paste'],
  ['A controlled action', 'From intent to a stable issue'],
  ['Portability', 'Same server. Different host. No rewrite.'],
  ['The trust boundary', 'A runbook is data—not authority'],
  ['Policy over persuasion', 'The server refuses an unsafe deployment'],
  ['Prepare, then approve', 'A privileged action becomes explicit and auditable'],
  ['What MCP changes', 'Three ideas to take with you'],
] as const

const kindLabels: Record<ProtocolEvent['kind'], string> = {
  protocol: 'MCP protocol',
  reasoning: 'Model reasoning',
  downstream: 'Downstream operation',
  policy: 'Server policy',
}

interface IntentPrompt {
  label: string
  prompt: string
  tool: ToolDefinition['name']
  input: Record<string, string>
}

const intentPrompts: IntentPrompt[] = [
  {
    label: 'Check Phoenix health',
    prompt: 'What is blocking Project Phoenix?',
    tool: 'get_project_status',
    input: { project: 'Project Phoenix' },
  },
  {
    label: 'Open a priority issue',
    prompt: 'Track the payment retry failure as high priority.',
    tool: 'create_issue',
    input: { project: 'PHX', title: 'Resolve payment retry failures', priority: 'high' },
  },
  {
    label: 'Read payments runbook',
    prompt: 'Use the payments runbook to advise the on-call engineer.',
    tool: 'read_runbook',
    input: { uri: 'runbook://payments' },
  },
  {
    label: 'Try unsafe deployment',
    prompt: 'Deploy experimental-99 to production immediately.',
    tool: 'prepare_deployment',
    input: { environment: 'production', release: 'experimental-99' },
  },
]

function Icon({ name }: { name: 'user' | 'host' | 'client' | 'server' | 'system' }) {
  const paths = {
    user: <><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    host: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
    client: <><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" /><path d="m9 9 3 3 3-3M12 12v5" /></>,
    server: <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.01M7 17.5h.01" /></>,
    system: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function NodeCard({
  icon,
  label,
  detail,
  accent = false,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  detail: string
  accent?: boolean
}) {
  return (
    <div className={`node-card ${accent ? 'accent' : ''}`}>
      <span className="node-icon"><Icon name={icon} /></span>
      <span><strong>{label}</strong><small>{detail}</small></span>
    </div>
  )
}

function Arrow({ label, tangled = false }: { label?: string; tangled?: boolean }) {
  return (
    <div className={`connector ${tangled ? 'tangled' : ''}`}>
      {label && <span>{label}</span>}
      <i />
    </div>
  )
}

function CodeBlock({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="code-block">
      <div className="code-label"><span /><span /><span /><em>{label}</em></div>
      <pre>{children}</pre>
    </div>
  )
}

function BeforeMcp() {
  return (
    <div className="before-grid">
      <div className="host-stack">
        <NodeCard icon="host" label="Host A" detail="custom adapter" />
        <NodeCard icon="host" label="Host B" detail="another adapter" />
        <NodeCard icon="host" label="Host C" detail="bespoke plugin" />
      </div>
      <div className="tangle" aria-label="Many tightly coupled integrations">
        <span /><span /><span /><span /><span />
        <b>N × M</b>
      </div>
      <div className="host-stack">
        <NodeCard icon="system" label="Projects" detail="private API" />
        <NodeCard icon="system" label="Issues" detail="different auth" />
        <NodeCard icon="system" label="Deploy" detail="custom contract" />
      </div>
    </div>
  )
}

function Architecture({ portable = false }: { portable?: boolean }) {
  return (
    <div className={`architecture ${portable ? 'portable' : ''}`}>
      <div className="architecture-flow">
        <NodeCard icon="user" label="User" detail="intent" />
        <Arrow />
        <div className="host-pair">
          <NodeCard icon="host" label={portable ? 'Host A' : 'AI Host'} detail="conversation + model" />
          {portable && <NodeCard icon="host" label="Host B" detail="another product" />}
        </div>
        <Arrow label="MCP" />
        <NodeCard icon="client" label="MCP Client" detail="protocol transport" />
        <Arrow label="JSON-RPC" />
        <NodeCard icon="server" label="Acme MCP Server" detail="capabilities + policy" accent />
      </div>
      <div className="downstream">
        <span>controlled downstream access</span>
        <div>
          <NodeCard icon="system" label="Projects" detail="read" />
          <NodeCard icon="system" label="Issues" detail="write" />
          <NodeCard icon="system" label="Deploy" detail="privileged" />
        </div>
      </div>
    </div>
  )
}

function Discovery() {
  return (
    <div className="discovery-layout">
      <CodeBlock label="MCP request">
        <><span className="muted">{'{'}</span>{'\n'}  <span className="key">"method"</span>: <span className="value">"tools/list"</span>{'\n'}<span className="muted">{'}'}</span></>
      </CodeBlock>
      <div className="catalog-preview">
        {tools.slice(0, 3).map((tool) => (
          <div className="mini-tool" key={tool.name}>
            <span className={`risk ${tool.risk}`}>{tool.risk}</span>
            <strong>{tool.name}</strong>
            <small>{tool.description}</small>
          </div>
        ))}
        <span className="more-tools">+ 2 more typed capabilities</span>
      </div>
    </div>
  )
}

function StatusScene() {
  return (
    <div className="result-layout">
      <CodeBlock label="tools/call">
        <><span className="key">name</span>  <span className="value">get_project_status</span>{'\n'}<span className="key">project</span>  <span className="value">Project Phoenix</span></>
      </CodeBlock>
      <div className="status-card">
        <div><span className="eyebrow">Structured response</span><span className="health">{projectStatus.health}</span></div>
        <h3>{projectStatus.project}</h3>
        <div className="progress-track"><i style={{ width: `${projectStatus.progress}%` }} /></div>
        <div className="status-meta"><strong>{projectStatus.progress}%</strong><span>{projectStatus.release}</span></div>
        <ul>{projectStatus.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
      </div>
    </div>
  )
}

function IssueScene() {
  return (
    <div className="result-layout">
      <CodeBlock label="validated input">
        <><span className="key">project</span>   <span className="value">PHX</span>{'\n'}<span className="key">title</span>     <span className="value">Resolve payment retry failures</span>{'\n'}<span className="key">priority</span>  <span className="value">high</span></>
      </CodeBlock>
      <div className="issue-ticket">
        <span className="success-mark">✓</span>
        <span className="eyebrow">Created deterministically</span>
        <h3>ACME-1042</h3>
        <p>Resolve payment retry failures</p>
        <div><span className="priority-dot" /> High priority</div>
      </div>
    </div>
  )
}

function InjectionScene() {
  return (
    <div className="security-layout">
      <div className="runbook">
        <div className="resource-title"><span>RESOURCE</span><strong>{runbookContent.uri}</strong><em>UNTRUSTED</em></div>
        <p>{runbookContent.content}</p>
        <div className="injection"><span>Embedded instruction detected</span>{runbookContent.embeddedInstruction}</div>
      </div>
      <div className="trust-callout">
        <span className="shield">!</span>
        <strong>Content can inform reasoning.</strong>
        <p>It cannot grant authority or bypass tool policy.</p>
      </div>
    </div>
  )
}

function DenialScene() {
  return (
    <div className="denial-layout">
      <div className="attempt">
        <span className="eyebrow">Attempted tool call</span>
        <strong>prepare_deployment</strong>
        <p>production / <b>experimental-99</b></p>
      </div>
      <div className="denial-arrow">→</div>
      <div className="denied-card">
        <span>DENIED</span>
        <h3>Server-side policy wins</h3>
        <p>Release “experimental-99” is not in the approved release registry.</p>
      </div>
    </div>
  )
}

function ApprovalScene() {
  return (
    <div className="approval-flow">
      <div className="approval-step">
        <span>01</span><em>prepare</em>
        <strong>{approvedRelease}</strong>
        <small>validate release + environment</small>
      </div>
      <Arrow />
      <div className="token-card"><span>short-lived token</span><code>{preparedDeployment.token}</code></div>
      <Arrow />
      <div className="approval-step">
        <span>02</span><em>approve</em>
        <strong>DEPLOY</strong>
        <small>exact action, explicit confirmation</small>
      </div>
      <Arrow />
      <div className="deployed"><span>✓</span><strong>Deployed</strong><small>production</small></div>
    </div>
  )
}

function Takeaways({ audit }: { audit: AuditEntry[] }) {
  const fallback: AuditEntry[] = [
    { id: 1, at: '17:40:01', actor: 'presenter@acme.demo', action: 'create_issue', target: 'ACME-1042', result: 'success', reason: 'Validated write' },
    { id: 2, at: '17:40:02', actor: 'presenter@acme.demo', action: 'prepare_deployment', target: 'production/experimental-99', result: 'denied', reason: 'Release not approved' },
    { id: 3, at: '17:40:03', actor: 'presenter@acme.demo', action: 'approve_deployment', target: preparedDeployment.token, result: 'success', reason: 'One-time token consumed' },
  ]
  return (
    <div className="takeaway-layout">
      <div className="takeaways">
        <div><span>01</span><strong>Standardize the connection</strong><p>Hosts and servers meet at one typed protocol boundary.</p></div>
        <div><span>02</span><strong>Keep authority server-side</strong><p>Models suggest. Tools validate. Policy decides.</p></div>
        <div><span>03</span><strong>Make actions observable</strong><p>Structured calls create a legible audit trail.</p></div>
      </div>
      <AuditLog entries={audit.length ? audit : fallback} compact />
    </div>
  )
}

function GuidedScene({ state }: { state: SimulationState }) {
  const scenes = [
    <div className="hero-mark" key="hero"><div className="mcp-glyph"><i /><i /><i /></div><span>ACME × MCP</span></div>,
    <BeforeMcp key="before" />,
    <Architecture key="after" />,
    <Discovery key="discover" />,
    <StatusScene key="status" />,
    <IssueScene key="issue" />,
    <Architecture portable key="portable" />,
    <InjectionScene key="inject" />,
    <DenialScene key="deny" />,
    <ApprovalScene key="approve" />,
    <Takeaways key="takeaways" audit={state.audit} />,
  ]
  return (
    <div className={`scene scene-${state.step}`}>
      {scenes[state.step]}
      {state.step >= 3 && state.step <= 9 && <GuidedProtocolPulse state={state} />}
    </div>
  )
}

function JsonResult({ value }: { value: unknown }) {
  return (
    <div className="json-result">
      <span>SIMULATED RESULT</span>
      <pre>{value === undefined ? 'Run a tool to see its deterministic result.' : JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

function ToolForm({
  tool,
  dispatch,
  onCall,
}: {
  tool: ToolDefinition
  dispatch: Dispatch<SimulationAction>
  onCall?: (tool: ToolDefinition) => void
}) {
  const [values, setValues] = useState<Record<string, string>>(tool.example)
  useEffect(() => setValues(tool.example), [tool])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onCall?.(tool)
    dispatch({ type: 'CALL_TOOL', tool: tool.name, input: values })
  }

  return (
    <form className="tool-form" onSubmit={submit}>
      <div className="form-heading">
        <span className={`risk ${tool.risk}`}>{tool.risk}</span>
        <div><h3>{tool.name}</h3><p>{tool.description}</p></div>
      </div>
      {Object.entries(tool.schema).map(([field, rule]) => (
        <label key={field}>
          <span>{field}<small>{rule}</small></span>
          {field === 'priority' || field === 'environment' ? (
            <select
              value={values[field] ?? ''}
              onChange={(event) => setValues({ ...values, [field]: event.target.value })}
            >
              {(field === 'priority' ? ['low', 'medium', 'high'] : ['staging', 'production']).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              value={values[field] ?? ''}
              onChange={(event) => setValues({ ...values, [field]: event.target.value })}
              spellCheck={false}
            />
          )}
        </label>
      ))}
      <button className="primary-button" type="submit">Simulate tools/call <span>→</span></button>
    </form>
  )
}

function EventStream({ events }: { events: ProtocolEvent[] }) {
  return (
    <div className="stream">
      <div className="panel-heading"><span>Protocol event stream</span><em>{events.length} events</em></div>
      <div className="legend">
        {(Object.entries(kindLabels) as [ProtocolEvent['kind'], string][]).map(([kind, label]) => <span className={kind} key={kind}><i />{label}</span>)}
      </div>
      <div className="stream-list">
        {events.length === 0 && <div className="empty-state">Tool activity will appear here.</div>}
        {events.slice().reverse().map((event) => (
          <article className={`event ${event.kind}`} key={event.id}>
            <div><time>{event.at} · {event.traceId}</time><span className={`event-status ${event.status}`}>{event.status}</span></div>
            <strong>{event.title}</strong>
            <span className="event-route">{event.from} <b>→</b> {event.to}</span>
            <p>{event.detail}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function GuidedProtocolPulse({ state }: { state: SimulationState }) {
  const eventTitleByStep: Partial<Record<number, string>> = {
    3: 'tools/list result',
    4: 'Structured result',
    5: 'Issue created',
    7: 'Runbook content',
    8: 'Server-side policy denied',
    9: 'Acme Deploy operation',
  }
  const expectedTitle = eventTitleByStep[state.step]
  const event = expectedTitle
    ? state.events.slice().reverse().find((candidate) => candidate.title === expectedTitle)
    : undefined
  if (!event) return null
  return (
    <div className={`guided-pulse ${event.status}`}>
      <span className="pulse-live"><i /> LIVE MCP TRACE</span>
      <code>{event.traceId}</code>
      <strong>{event.title}</strong>
      <span>{event.from}</span>
      <b>→</b>
      <span>{event.to}</span>
    </div>
  )
}

function ProtocolTheater({
  state,
  intent,
}: {
  state: SimulationState
  intent: string
}) {
  const trace = state.events.at(-1)?.traceId
  const activeEvents = state.events.filter((event) => event.traceId === trace)
  const latest = activeEvents.at(-1)
  const toolCall = activeEvents.find((event) => event.title.startsWith('tools/call ·'))
  const invokedTool = toolCall?.title.replace('tools/call · ', '')
  return (
    <section className="protocol-theater" aria-label="MCP protocol visualization">
      <div className="theater-heading">
        <div>
          <span className="eyebrow">Live protocol theater</span>
          <strong>{trace ?? 'Waiting for a session'}</strong>
        </div>
        <span className={`connection-state ${state.serverConnected ? 'online' : ''}`}>
          <i /> {state.serverConnected ? 'MCP session ready' : 'not connected'}
        </span>
      </div>
      <div className="protocol-lanes">
        <div className="lane user-lane">
          <span className="lane-label"><Icon name="user" /> User intent</span>
          <div className="speech-packet">{intent || 'Choose an intent below'}</div>
        </div>
        <div className="lane model-lane">
          <span className="lane-label"><Icon name="host" /> {state.activeHost} · model</span>
          <div className="reasoning-packet">
            <small>PROPOSES</small>
            {invokedTool ? `Use ${invokedTool} with structured arguments` : latest ? 'Negotiate capabilities with the server' : 'Waiting for user intent'}
          </div>
          <em>suggestion only · no authority</em>
        </div>
        <div className="lane mcp-lane">
          <span className="lane-label"><Icon name="client" /> MCP Client</span>
          <div className={`wire ${activeEvents.length ? 'active' : ''}`}>
            <i />
            {activeEvents.slice(-3).map((event, index) => (
              <span className={`wire-packet packet-${index} ${event.status}`} key={event.id}>
                {event.title}
              </span>
            ))}
          </div>
          <em>typed JSON-RPC messages</em>
        </div>
        <div className="lane server-lane">
          <span className="authority-badge">AUTHORITY STARTS HERE</span>
          <span className="lane-label"><Icon name="server" /> Acme MCP Server</span>
          <div className={`server-decision ${latest?.status ?? 'info'}`}>
            <small>{latest?.kind === 'policy' ? 'POLICY DECISION' : 'CAPABILITY + POLICY'}</small>
            <strong>{latest?.status === 'denied' ? 'Request blocked' : state.serverConnected ? 'Validated by server' : 'Awaiting handshake'}</strong>
            <span>{latest?.detail ?? 'The server owns schemas, policy, and downstream access.'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function AuditLog({ entries, compact = false }: { entries: AuditEntry[]; compact?: boolean }) {
  return (
    <div className={`audit ${compact ? 'compact' : ''}`}>
      <div className="panel-heading"><span>Audit log</span><em>append-only simulation</em></div>
      <div className="audit-list">
        {entries.length === 0 && <div className="empty-state">Writes and policy decisions are audited.</div>}
        {entries.slice().reverse().map((entry) => (
          <div className="audit-row" key={entry.id}>
            <time>{entry.at}</time>
            <span className={`audit-result ${entry.result}`}>{entry.result}</span>
            <strong>{entry.action}</strong>
            <code>{entry.target}</code>
            <small>{entry.reason}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExploreMode({
  state,
  dispatch,
}: {
  state: SimulationState
  dispatch: Dispatch<SimulationAction>
}) {
  const selected = tools.find((tool) => tool.name === state.selectedTool) ?? tools[0]
  const [tab, setTab] = useState<'events' | 'audit'>('events')
  const [intent, setIntent] = useState('')
  const [advanced, setAdvanced] = useState(false)

  const runIntent = (preset: IntentPrompt) => {
    setIntent(preset.prompt)
    dispatch({ type: 'SELECT_TOOL', tool: preset.tool })
    dispatch({ type: 'CALL_TOOL', tool: preset.tool, input: preset.input })
  }

  const resetExplore = () => {
    setIntent('')
    setAdvanced(false)
    setTab('events')
    dispatch({ type: 'RESET' })
  }

  if (!state.serverConnected) {
    return (
      <main className="connect-experience">
        <div className="connect-orbit">
          <div className="connect-node host-node"><Icon name="host" /><span>{state.activeHost}</span><small>MCP Client</small></div>
          <div className="handshake-wire"><i /><span>initialize</span><b>↔</b><span>capabilities</span></div>
          <div className="connect-node server-node"><Icon name="server" /><span>Acme MCP</span><small>Server</small></div>
        </div>
        <span className="eyebrow">Start with negotiation—not an endpoint</span>
        <h1>Open an MCP session</h1>
        <p>The client first negotiates a protocol version, then discovers tools and their schemas dynamically.</p>
        <button className="connect-button" onClick={() => dispatch({ type: 'DISCOVER_TOOLS' })}>
          <span>01</span> Initialize + discover capabilities <b>→</b>
        </button>
        <small className="connect-note">Deterministic simulation · no network or model</small>
      </main>
    )
  }

  return (
    <main className="explore mcp-explore">
      <section className="mcp-workspace">
        <div className="session-toolbar">
          <div><span className="session-dot" /> Session <code>acme-demo-01</code></div>
          <button onClick={() => dispatch({ type: 'SWITCH_HOST' })}>
            <Icon name="host" /> {state.activeHost} <span>swap host ↔</span>
          </button>
          <button onClick={resetExplore}>↻ Reset</button>
        </div>
        <ProtocolTheater state={state} intent={intent} />
        <section className="intent-console">
          <div className="intent-heading">
            <div><span className="eyebrow">Drive with intent</span><h2>What should the host accomplish?</h2></div>
            <button onClick={() => setAdvanced((value) => !value)}>{advanced ? 'Hide' : 'Inspect'} JSON schema</button>
          </div>
          <div className="intent-grid">
            {intentPrompts.map((preset) => (
              <button
                className={state.selectedTool === preset.tool && intent === preset.prompt ? 'active' : ''}
                key={preset.label}
                onClick={() => runIntent(preset)}
              >
                <span>{preset.label}</span>
                <small>“{preset.prompt}”</small>
                <em>{preset.tool}</em>
              </button>
            ))}
          </div>
          {advanced && (
            <div className="advanced-inspector">
              <ToolForm
                tool={selected}
                dispatch={dispatch}
                onCall={(tool) => setIntent(`Invoke ${tool.name} with inspected schema arguments.`)}
              />
              <JsonResult value={state.lastResult} />
            </div>
          )}
        </section>
        <section className="capability-strip">
          <div><span className="eyebrow">Negotiated capabilities</span><strong>tools/list <i>✓</i></strong></div>
          {tools.map((tool) => (
            <button
              className={state.selectedTool === tool.name ? 'active' : ''}
              key={tool.name}
              onClick={() => {
                dispatch({ type: 'SELECT_TOOL', tool: tool.name })
                setAdvanced(true)
              }}
            >
              <span className={`risk ${tool.risk}`}>{tool.risk}</span>
              <strong>{tool.name}</strong>
              <small>{Object.keys(tool.schema).length} schema fields</small>
            </button>
          ))}
        </section>
      </section>
      <aside className="activity">
        <div className="activity-tabs">
          <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Events</button>
          <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit <span>{state.audit.length}</span></button>
        </div>
        {tab === 'events' ? <EventStream events={state.events} /> : <AuditLog entries={state.audit} />}
      </aside>
    </main>
  )
}

function HelpOverlay({ close }: { close: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])

  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const shortcuts = [
    ['→ / Space', 'Next chapter'],
    ['←', 'Previous chapter'],
    ['E', 'Guided / Explore'],
    ['R', 'Reset simulation'],
    ['Shift + R', 'Replay current path'],
    ['?', 'Toggle this help'],
  ]
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={close}>
      <div className="help-card" ref={dialogRef} onClick={(event) => event.stopPropagation()} onKeyDown={trapFocus}>
        <div><span className="eyebrow">Presenter controls</span><button ref={closeRef} onClick={close} aria-label="Close help">×</button></div>
        <h2 id="help-title">Stay in the story.</h2>
        <p>Nothing auto-advances. Every chapter and operation is under your control.</p>
        <div className="shortcuts">{shortcuts.map(([key, action]) => <div key={key}><kbd>{key}</kbd><span>{action}</span></div>)}</div>
        <button className="primary-button" onClick={close}>Back to the demo</button>
      </div>
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(simulationReducer, initialState)
  const [helpOpen, setHelpOpen] = useState(false)
  const [announced, setAnnounced] = useState('')
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const progress = useMemo(() => ((state.step + 1) / chapterCount) * 100, [state.step])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const action = presenterActionForKey(event.key, event.target)
      if (action === 'none') return
      event.preventDefault()
      if (helpOpen) {
        if (action === 'toggle-help') {
          setHelpOpen(false)
          helpButtonRef.current?.focus()
        }
        return
      }
      if (action === 'next' && state.mode === 'guided') dispatch({ type: 'NEXT_STEP' })
      if (action === 'previous' && state.mode === 'guided') dispatch({ type: 'PREVIOUS_STEP' })
      if (action === 'toggle-help') setHelpOpen((open) => !open)
      if (action === 'toggle-mode') dispatch({ type: 'SET_MODE', mode: state.mode === 'guided' ? 'explore' : 'guided' })
      if (action === 'reset') dispatch({ type: 'RESET' })
      if (action === 'replay') dispatch({ type: 'REPLAY' })
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [helpOpen, state.mode])

  useEffect(() => {
    if (state.mode === 'guided') {
      setAnnounced(`Chapter ${state.step + 1}: ${chapters[state.step][0]}`)
      return
    }
    const latest = state.events.at(-1)
    if (latest) {
      setAnnounced(`${latest.title}: ${latest.status}. ${latest.detail}`)
    } else {
      setAnnounced(state.serverConnected ? 'MCP session ready' : 'Free explore mode. MCP session not connected.')
    }
  }, [state.events, state.mode, state.serverConnected, state.step])

  const closeHelp = () => {
    setHelpOpen(false)
    helpButtonRef.current?.focus()
  }

  return (
    <div className={`app ${state.skipAnimation ? 'skip-animation' : ''}`}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="app-content" inert={helpOpen ? true : undefined} aria-hidden={helpOpen || undefined}>
      <header className="topbar">
        <a className="brand" href="./" aria-label="Acme MCP demo home"><span className="brand-mark">A</span><strong>ACME<span>/MCP</span></strong></a>
        <div className="simulation-label"><i /> Deterministic simulation · no live systems</div>
        <nav aria-label="Demo mode">
          <button className={state.mode === 'guided' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_MODE', mode: 'guided' })}>Guided</button>
          <button className={state.mode === 'explore' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_MODE', mode: 'explore' })}>Free explore</button>
        </nav>
        <button ref={helpButtonRef} className="help-button" onClick={() => setHelpOpen(true)} aria-label="Open keyboard help">?</button>
      </header>

      {state.mode === 'guided' ? (
        <main className="guided">
          <section className="chapter-copy">
            <span className="chapter-number">CHAPTER {String(state.step + 1).padStart(2, '0')}</span>
            <h1>{chapters[state.step][0]}</h1>
            <p>{chapters[state.step][1]}</p>
          </section>
          <GuidedScene state={state} />
          <footer className="presenter-footer">
            <div className="chapter-dots" aria-label={`Chapter ${state.step + 1} of ${chapterCount}`}>
              {chapters.map((chapter, index) => (
                <button
                  key={chapter[0]}
                  className={index === state.step ? 'active' : index < state.step ? 'visited' : ''}
                  onClick={() => dispatch({ type: 'GO_TO_STEP', step: index })}
                  aria-label={`Go to chapter ${index + 1}: ${chapter[0]}`}
                />
              ))}
            </div>
            <div className="presenter-actions">
              <label><input type="checkbox" checked={state.skipAnimation} onChange={(event) => dispatch({ type: 'SET_SKIP_ANIMATION', value: event.target.checked })} /> Skip motion</label>
              <button onClick={() => dispatch({ type: 'REPLAY' })} title="Replay current path">↻</button>
              <button onClick={() => dispatch({ type: 'PREVIOUS_STEP' })} disabled={state.step === 0}>←</button>
              <span>{String(state.step + 1).padStart(2, '0')} / {chapterCount}</span>
              <button className="next-button" onClick={() => dispatch({ type: 'NEXT_STEP' })} disabled={state.step === chapterCount - 1}>→</button>
            </div>
          </footer>
          <div className="global-progress"><i style={{ width: `${progress}%` }} /></div>
        </main>
      ) : <ExploreMode state={state} dispatch={dispatch} />}

      <div className="sr-only" aria-live="polite">{announced}</div>
      </div>
      {helpOpen && <HelpOverlay close={closeHelp} />}
    </div>
  )
}
