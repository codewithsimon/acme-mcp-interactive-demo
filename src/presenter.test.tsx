import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { presenterActionForKey } from './presenter'

describe('presenter controls', () => {
  it('maps stage navigation and mode keys', () => {
    expect(presenterActionForKey('ArrowRight')).toBe('next')
    expect(presenterActionForKey(' ')).toBe('next')
    expect(presenterActionForKey('ArrowLeft')).toBe('previous')
    expect(presenterActionForKey('E')).toBe('toggle-mode')
    expect(presenterActionForKey('?')).toBe('toggle-help')
  })

  it('does not navigate while typing in form fields', () => {
    const input = document.createElement('input')
    expect(presenterActionForKey('ArrowRight', input)).toBe('none')
  })

  it('moves chapters and opens help from the keyboard', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'A common language for AI tools' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Before MCP' })).toBeTruthy()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
