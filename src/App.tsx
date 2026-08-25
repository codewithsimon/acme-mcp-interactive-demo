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
  return <div className={`scene scene-${state.step}`}>{scenes[state.step]}</div>
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
}: {
  tool: ToolDefinition
  dispatch: Dispatch<SimulationAction>
}) {
  const [values, setValues] = useState<Record<string, string>>(tool.example)
  useEffect(() => setValues(tool.example), [tool])

  const submit = (event: FormEvent) => {
    event.preventDefault()
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
            <div><time>{event.at}</time><span className={`event-status ${event.status}`}>{event.status}</span></div>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </article>
        ))}
      </div>
    </div>
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
  return (
    <main className="explore">
      <aside className="catalog">
        <div className="catalog-title"><span>Capability catalog</span><em>tools/list</em></div>
        {tools.map((tool) => (
          <button
            className={state.selectedTool === tool.name ? 'active' : ''}
            key={tool.name}
            onClick={() => dispatch({ type: 'SELECT_TOOL', tool: tool.name })}
          >
            <Icon name={tool.risk === 'read' ? 'system' : tool.risk === 'write' ? 'client' : 'server'} />
            <span><strong>{tool.name}</strong><small>{tool.risk}</small></span>
          </button>
        ))}
        <button className="reset-button" onClick={() => dispatch({ type: 'RESET' })}>↻ Reset simulation</button>
      </aside>
      <section className="workbench">
        <div className="workbench-grid">
          <ToolForm tool={selected} dispatch={dispatch} />
          <JsonResult value={state.lastResult} />
        </div>
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
    setAnnounced(state.mode === 'guided' ? `Chapter ${state.step + 1}: ${chapters[state.step][0]}` : 'Free explore mode')
  }, [state.mode, state.step])

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
