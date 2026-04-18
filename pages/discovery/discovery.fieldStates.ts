import type { CSSProperties } from 'react'
import type { ValueOrigin } from './discovery.helpers'

export function getFieldStateLabel(origin: ValueOrigin) {
  if (origin === 'manual') return 'Manuel'
  if (origin === 'incomplete') return 'Incomplet'
  return 'Auto'
}

export function getFieldStateStyle(origin: ValueOrigin): CSSProperties {
  if (origin === 'manual') {
    return {
      background: 'rgba(200,166,106,0.14)',
      color: '#8f6f43',
      border: '1px solid rgba(200,166,106,0.24)',
    }
  }

  if (origin === 'incomplete') {
    return {
      background: 'rgba(168,93,93,0.12)',
      color: '#a85d5d',
      border: '1px solid rgba(168,93,93,0.22)',
    }
  }

  return {
    background: 'rgba(111,143,114,0.12)',
    color: '#6f8f72',
    border: '1px solid rgba(111,143,114,0.22)',
  }
}
