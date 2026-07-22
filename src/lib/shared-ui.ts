// Shared UI utilities for case management components
// Consolidates common color/badge/icon patterns used across multiple components

export type SeverityLevel = 'критический' | 'высокий' | 'средний' | 'низкий' | 'особо тяжкое' | 'тяжкое' | 'средней тяжести' | 'небольшой'
export type StatusKey = 'completed' | 'active' | 'planned' | 'pending' | 'failed' | 'processing' | 'confirm' | 'deny' | 'dont-remember' | 'no-data' | 'admissible' | 'questionable' | 'inadmissible' | 'intact' | 'transferred' | 'analyzed' | 'questioned' | 'critical' | 'major' | 'minor' | 'low' | 'moderate' | 'high' | 'strong' | 'weak'
export type SideKey = 'prosecution' | 'defense' | 'обвинение' | 'защита'

// Unified severity color system
const SEV_COLORS: Record<string, [string, string]> = {
  'критический': ['bg-red-900 text-red-100', '#7f1d1d'],
  'особо тяжкое': ['bg-red-900/20 text-red-400', '#7f1d1d'],
  'высокий': ['bg-red-700 text-white', '#dc2626'],
  'тяжкое': ['bg-red-700/20 text-red-500', '#dc2626'],
  'critical': ['bg-red-700 text-white', '#dc2626'],
  'major': ['bg-red-600 text-white', '#dc2626'],
  'high': ['bg-orange-600 text-white', '#ea580c'],
  'средней тяжести': ['bg-orange-600/20 text-orange-500', '#ea580c'],
  'средний': ['bg-orange-500 text-white', '#ea580c'],
  'moderate': ['bg-yellow-600 text-white', '#ca8a04'],
  'небольшой': ['bg-yellow-600/20 text-yellow-600', '#ca8a04'],
  'низкий': ['bg-emerald-700 text-white', '#059669'],
  'minor': ['bg-emerald-600 text-white', '#059669'],
  'low': ['bg-emerald-600 text-white', '#059669'],
  'strong': ['bg-emerald-700 text-white', '#059669'],
  'weak': ['bg-stone-600 text-white', '#57534e'],
}

export function sevBadge(level: string): string { return (SEV_COLORS[level] ?? ['bg-stone-600 text-white', '#57534e'])[0] }
export function sevHex(level: string): string { return (SEV_COLORS[level] ?? ['bg-stone-600 text-white', '#57534e'])[1] }

// Unified status color system
const STAT_COLORS: Record<string, string> = {
  completed: 'bg-emerald-700 text-white', active: 'bg-blue-600 text-white', planned: 'bg-stone-500 text-white',
  pending: 'bg-yellow-600 text-white', processing: 'bg-orange-500 text-white', failed: 'bg-red-700 text-white',
  confirm: 'bg-emerald-700 text-white', deny: 'bg-red-700 text-white', 'dont-remember': 'bg-yellow-600 text-white', 'no-data': 'bg-stone-500 text-white',
  admissible: 'bg-emerald-700 text-white', questionable: 'bg-yellow-600 text-white', inadmissible: 'bg-red-700 text-white',
  intact: 'bg-emerald-700 text-white', transferred: 'bg-blue-600 text-white', analyzed: 'bg-orange-500 text-white', questioned: 'bg-red-700 text-white',
}
export function statBadge(status: string): string { return STAT_COLORS[status] ?? 'bg-stone-600 text-white' }

// Side color system (prosecution=red, defense=emerald)
export function sideBadge(side: string): string {
  return side === 'prosecution' || side === 'обвинение' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'
}
export function sideHex(side: string): string {
  return side === 'prosecution' || side === 'обвинение' ? '#dc2626' : '#059669'
}

// Risk level colors
export function riskColor(level: string): string {
  const m: Record<string, string> = { low: 'bg-emerald-700 text-white', moderate: 'bg-yellow-600 text-white', high: 'bg-orange-600 text-white', critical: 'bg-red-700 text-white' }
  return m[level] ?? 'bg-stone-600 text-white'
}

// Bookmark border colors
export const BK_BORDER: Record<string, string> = { red: 'border-l-red-700', amber: 'border-l-amber-600', emerald: 'border-l-emerald-700', stone: 'border-l-stone-500' }

// Helper: score to color gradient
export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

// Helper: score to progress bar color class
export function scoreBar(score: number): string {
  if (score >= 80) return '[&>div]:bg-emerald-600'
  if (score >= 60) return '[&>div]:bg-yellow-600'
  if (score >= 40) return '[&>div]:bg-orange-600'
  return '[&>div]:bg-red-600'
}

// Common CSS card grid pattern
export const GRID2 = 'grid grid-cols-1 md:grid-cols-2 gap-4'
export const GRID3 = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
export const GRID4 = 'grid grid-cols-2 md:grid-cols-4 gap-4'

// Chart tooltip config
export const CHART_CFG = { tooltip: { cursor: false } }

// Recharts cell color palette (red/amber/emerald/stone theme)
export const PALETTE = ['#dc2626', '#ea580c', '#059669', '#57534e', '#b91c1c', '#d97706', '#047857', '#78716c']

// Helper: month label from index (0=Мар 23, 12=Мар 24)
const MONTHS = ['Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар']
export function monthLabel(idx: number): string { return `${MONTHS[idx % 12]} ${idx < 10 ? '23' : '24'}` }

// Helper: format date compactly
export function fmtDate(d: string): string {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Helper: compact file size
export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / 1048576).toFixed(1)} МБ`
}
