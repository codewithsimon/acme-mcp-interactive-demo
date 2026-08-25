import { describe, expect, it } from 'vitest'
import {
  approvedRelease,
  deploymentPolicy,
  preparedDeployment,
  validateToolInput,
} from './domain'

describe('tool input validators', () => {
  it('accepts a valid issue and rejects a short title', () => {
    expect(
      validateToolInput('create_issue', {
        project: 'PHX',
        title: 'Resolve payment retries',
        priority: 'high',
      }).ok,
    ).toBe(true)
    expect(
      validateToolInput('create_issue', {
        project: 'PHX',
        title: 'Fix',
        priority: 'high',
      }),
    ).toMatchObject({ ok: false, error: 'Title must be between 5 and 80 characters' })
  })

  it('requires the runbook scheme and exact approval confirmation', () => {
    expect(validateToolInput('read_runbook', { uri: 'https://example.com' }).ok).toBe(false)
    expect(
      validateToolInput('approve_deployment', {
        token: preparedDeployment.token,
        confirmation: 'deploy',
      }).ok,
    ).toBe(false)
  })
})

describe('deployment policy', () => {
  it('denies an unapproved release server-side', () => {
    expect(
      deploymentPolicy(
        'prepare_deployment',
        { environment: 'production', release: 'experimental-99' },
        { usedTokens: [] },
      ),
    ).toEqual({
      ok: false,
      error: 'Release "experimental-99" is not in the approved release registry',
    })
  })

  it('permits the approved two-step flow and rejects token replay', () => {
    const prepared = deploymentPolicy(
      'prepare_deployment',
      { environment: 'production', release: approvedRelease },
      { usedTokens: [] },
    )
    expect(prepared).toMatchObject({ ok: true, value: preparedDeployment })

    expect(
      deploymentPolicy(
        'approve_deployment',
        { token: preparedDeployment.token, confirmation: 'DEPLOY' },
        { prepared: preparedDeployment, usedTokens: [] },
      ).ok,
    ).toBe(true)
    expect(
      deploymentPolicy(
        'approve_deployment',
        { token: preparedDeployment.token, confirmation: 'DEPLOY' },
        { prepared: preparedDeployment, usedTokens: [preparedDeployment.token] },
      ),
    ).toMatchObject({ ok: false, error: 'Approval token has already been used' })
  })

  it('preserves the requested environment in a prepared deployment', () => {
    const result = deploymentPolicy(
      'prepare_deployment',
      { environment: 'staging', release: approvedRelease },
      { usedTokens: [] },
    )
    expect(result.value?.environment).toBe('staging')
  })
})
