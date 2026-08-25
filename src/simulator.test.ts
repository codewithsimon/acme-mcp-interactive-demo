import { describe, expect, it } from 'vitest'
import { preparedDeployment } from './domain'
import { initialState, simulationReducer, type SimulationState } from './simulator'

function advance(state: SimulationState, steps: number) {
  let next = state
  for (let index = 0; index < steps; index += 1) {
    next = simulationReducer(next, { type: 'NEXT_STEP' })
  }
  return next
}

describe('simulation reducer', () => {
  it('resets all mutable simulation data but preserves mode and motion preference', () => {
    const used = {
      ...initialState,
      mode: 'explore' as const,
      skipAnimation: true,
      events: [{ id: 1, at: 'now', kind: 'protocol' as const, status: 'sent' as const, title: 'call', detail: 'detail' }],
      usedTokens: [preparedDeployment.token],
      issueCreated: true,
    }
    expect(simulationReducer(used, { type: 'RESET' })).toEqual({
      ...initialState,
      mode: 'explore',
      skipAnimation: true,
    })
  })

  it('replays the deterministic path to the current step', () => {
    const atStatus = advance(initialState, 4)
    const replayed = simulationReducer(atStatus, { type: 'REPLAY' })
    expect(replayed.step).toBe(4)
    expect(replayed.lastResult).toEqual(atStatus.lastResult)
    expect(replayed.events).toEqual(atStatus.events)
    expect(replayed.replayCount).toBe(1)
  })

  it('protects a deployment approval token from reuse', () => {
    const completed = advance(initialState, 9)
    expect(completed.deploymentComplete).toBe(true)
    const replayAttempt = simulationReducer(completed, {
      type: 'CALL_TOOL',
      tool: 'approve_deployment',
      input: { token: preparedDeployment.token, confirmation: 'DEPLOY' },
    })
    expect(replayAttempt.lastResult).toEqual({ error: 'Approval token has already been used' })
    expect(replayAttempt.audit.at(-1)?.result).toBe('denied')
  })

  it('executes the complete guided security path', () => {
    const completed = advance(initialState, 9)
    const reasoning = completed.events.find((event) => event.kind === 'reasoning')
    const denial = completed.audit.find((entry) => entry.result === 'denied')
    expect(reasoning?.detail).toContain('untrusted data')
    expect(denial?.target).toBe('production/experimental-99')
    expect(completed.prepared).toEqual(preparedDeployment)
    expect(completed.deploymentComplete).toBe(true)
    expect(completed.audit.map((entry) => entry.action)).toEqual([
      'create_issue',
      'prepare_deployment',
      'prepare_deployment',
      'approve_deployment',
    ])
  })

  it('does not repeat side effects when revisiting a chapter', () => {
    const completed = advance(initialState, 9)
    const back = simulationReducer(completed, { type: 'PREVIOUS_STEP' })
    const forward = simulationReducer(back, { type: 'NEXT_STEP' })
    expect(forward.events).toEqual(completed.events)
    expect(forward.audit).toEqual(completed.audit)
    expect(forward.deploymentComplete).toBe(true)
  })
})
