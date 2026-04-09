/**
 * Misma lógica que TournamentResults: categorías + orden por neto (scratch por gross).
 * Las **bandas de categoría** usan índice primero; sin índice útil, HCP local.
 * **Empates (neto y gross/scratch):** mejor vuelta (`back_nine`); si empatan → gross en hoyos 13–18;
 *   si empatan → gross en 16–18; si empatan → menor `handicap_index`; luego ida, luego gross total.
 * Sin dependencias de React ni iconos.
 */

export interface CategoryResult {
  position: number
  player_name: string
  player_type: 'member' | 'external'
  handicap_local: number | null
  handicap_index: number | null
  total_gross: number
  total_net: number
  front_nine: number
  back_nine: number
  /** Gross en hoyos 13–18 (últimos 6 de la vuelta); null si falta algún golpe en ese tramo */
  vuelta_last6_gross: number | null
  /** Gross en hoyos 16–18 (últimos 3 de la vuelta); null si falta algún golpe en ese tramo */
  vuelta_last3_gross: number | null
  member_number?: string
  club_name?: string
}

export interface CategoryDefinition {
  id: string
  name: string
  description: string
  color: string
  filter: (scorecard: any) => boolean
}

/**
 * Ida y vuelta alineadas con `total_gross` para **mostrar y ordenar** igual:
 * - Si falta una mitad (la otra es 0) pero el gross cierra → se completa (gross − ida o gross − vuelta).
 * - Si ida+vuelta ya suman el gross, se dejan tal cual.
 */
export function normalizeIdaVueltaForResults(scorecard: any): { front: number; back: number } {
  const g = Number(scorecard?.total_gross) || 0
  let f = Number(scorecard?.front_nine)
  let b = Number(scorecard?.back_nine)
  if (!Number.isFinite(f)) f = 0
  if (!Number.isFinite(b)) b = 0
  if (f < 0) f = 0
  if (b < 0) b = 0

  if (g <= 0) return { front: f, back: b }
  if (f > 0 && b > 0 && f + b === g) return { front: f, back: b }
  if (f > 0 && b === 0 && g >= f) return { front: f, back: g - f }
  if (b > 0 && f === 0 && g >= b) return { front: g - b, back: b }
  if (f > 0 && b > 0 && f + b !== g && Math.abs(f + b - g) <= 2) return { front: f, back: b }
  return { front: f, back: b }
}

/**
 * Net para clasificación: misma lógica que el portal (`display_net`): primero `participant_handicap_used`
 * (HCP de juego del torneo), si no `handicap_local`, si no `handicap_index`; WH negativo → gross + |hcp|.
 */
export function computeNetForResultsRow(scorecard: any, categoryId: string): number {
  if (categoryId.startsWith('scratch')) return Number(scorecard.total_gross) || 0
  const gross = Number(scorecard.total_gross) || 0
  if (gross <= 0) return 0

  const idxWhsRaw =
    scorecard.handicap_index_used_for_net ?? scorecard.handicap_index_used ?? scorecard.handicap_index
  const idxWhs =
    idxWhsRaw != null && idxWhsRaw !== '' && String(idxWhsRaw).trim() !== ''
      ? Number(idxWhsRaw)
      : null

  let hcpStrokes = 0
  const usedRaw = scorecard.participant_handicap_used ?? scorecard.handicap_used
  if (usedRaw != null && usedRaw !== '' && String(usedRaw).trim() !== '' && !Number.isNaN(Number(usedRaw))) {
    hcpStrokes = Math.round(Number(usedRaw))
  } else if (
    scorecard.handicap_local != null &&
    scorecard.handicap_local !== '' &&
    String(scorecard.handicap_local).trim() !== '' &&
    !Number.isNaN(Number(scorecard.handicap_local))
  ) {
    hcpStrokes = Math.round(Number(scorecard.handicap_local))
  } else {
    hcpStrokes = Math.round(Number(scorecard.handicap_index ?? 0))
  }

  if (idxWhs !== null && !Number.isNaN(idxWhs) && idxWhs < 0) {
    return gross + Math.abs(hcpStrokes)
  }
  return gross - hcpStrokes
}

/**
 * Suma golpes gross en [firstHole, lastHole] usando `hole_scores` o `scores`.
 * null si falta algún hoyo o el valor no es un entero de golpes válido (> 0).
 */
export function sumGrossStrokesHoleRange(
  scorecard: any,
  firstHole: number,
  lastHole: number
): number | null {
  const hs = scorecard?.hole_scores ?? scorecard?.scores
  if (!hs || typeof hs !== 'object') return null
  let sum = 0
  for (let h = firstHole; h <= lastHole; h++) {
    const raw = hs[h] ?? hs[String(h)]
    const s = Number(raw)
    if (!Number.isFinite(s) || s < 1) return null
    sum += Math.round(s)
  }
  return sum
}

function handicapIndexForTiebreak(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    if (v.trim() === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Menor net gana; empate fino en net; luego mejor vuelta; luego 13–18; 16–18; menor índice; ida; gross. */
export function compareCategoryResults(
  a: Pick<
    CategoryResult,
    | 'total_net'
    | 'back_nine'
    | 'front_nine'
    | 'total_gross'
    | 'handicap_index'
    | 'vuelta_last6_gross'
    | 'vuelta_last3_gross'
  >,
  b: Pick<
    CategoryResult,
    | 'total_net'
    | 'back_nine'
    | 'front_nine'
    | 'total_gross'
    | 'handicap_index'
    | 'vuelta_last6_gross'
    | 'vuelta_last3_gross'
  >
): number {
  const na = Math.round(Number(a.total_net))
  const nb = Math.round(Number(b.total_net))
  if (na !== nb) return na - nb
  const dNetFine = Number(a.total_net) - Number(b.total_net)
  if (dNetFine !== 0) return dNetFine < 0 ? -1 : 1
  const dBack = Number(a.back_nine) - Number(b.back_nine)
  if (dBack !== 0) return dBack

  const a6 = a.vuelta_last6_gross
  const b6 = b.vuelta_last6_gross
  if (a6 != null && b6 != null) {
    const d6 = a6 - b6
    if (d6 !== 0) return d6
  } else if (a6 != null && b6 == null) return -1
  else if (a6 == null && b6 != null) return 1

  const a3 = a.vuelta_last3_gross
  const b3 = b.vuelta_last3_gross
  if (a3 != null && b3 != null) {
    const d3 = a3 - b3
    if (d3 !== 0) return d3
  } else if (a3 != null && b3 == null) return -1
  else if (a3 == null && b3 != null) return 1

  const ia = handicapIndexForTiebreak(a.handicap_index)
  const ib = handicapIndexForTiebreak(b.handicap_index)
  if (ia != null && ib != null) {
    const dIdx = ia - ib
    if (dIdx !== 0) return dIdx
  } else if (ia != null && ib == null) return -1
  else if (ia == null && ib != null) return 1

  const dFront = Number(a.front_nine) - Number(b.front_nine)
  if (dFront !== 0) return dFront
  return Number(a.total_gross) - Number(b.total_gross)
}

function parseHcpField(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' && v.trim() === '') return null
  const h = parseFloat(String(v).trim())
  return Number.isFinite(h) ? h : null
}

export function getEffectiveHcpForCategory(scorecard: any): number | null {
  const idx = parseHcpField(scorecard.handicap_index)
  if (idx !== null) return idx
  return parseHcpField(scorecard.handicap_local)
}

function playerResultKey(scorecard: any): string {
  if (scorecard.member_id != null && scorecard.member_id !== '')
    return `m:${Number(scorecard.member_id)}`
  if (scorecard.external_player_id != null && scorecard.external_player_id !== '')
    return `e:${Number(scorecard.external_player_id)}`
  return `n:${String(scorecard.player_name || '').trim().toLowerCase()}`
}

export function dedupeScorecardsForResults(scorecards: any[]): any[] {
  const map = new Map<string, any>()
  for (const sc of scorecards) {
    const key = playerResultKey(sc)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, sc)
      continue
    }
    const rank = (row: any) => {
      const hasHcp = getEffectiveHcpForCategory(row) !== null ? 1 : 0
      const gross = Number(row.total_gross)
      const g = Number.isFinite(gross) && gross > 0 ? gross : 999
      const { front: rf, back: rb } = normalizeIdaVueltaForResults(row)
      const splitErr = g > 0 && g < 999 ? Math.abs(rf + rb - g) : 99
      const t = new Date(row.updated_at || row.created_at || 0).getTime()
      return { hasHcp, g, splitErr, t }
    }
    const a = rank(existing)
    const b = rank(sc)
    if (b.splitErr < a.splitErr) map.set(key, sc)
    else if (b.splitErr === a.splitErr && b.hasHcp > a.hasHcp) map.set(key, sc)
    else if (b.splitErr === a.splitErr && b.hasHcp === a.hasHcp && b.g < a.g) map.set(key, sc)
    else if (b.splitErr === a.splitErr && b.hasHcp === a.hasHcp && b.g === a.g && b.t > a.t) map.set(key, sc)
  }
  return Array.from(map.values())
}

export function sanitizeAscii(text: string | undefined | null): string {
  const base = (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
  return base.replace(/\s+/g, ' ').trim()
}

export function buildCategoryDefinitions(
  separateLadies: boolean,
  ladiesByHcp: boolean,
  resultsMode: 'standard' | 'scratch_bands' | string
): CategoryDefinition[] {
  const mode = resultsMode === 'scratch_bands' ? 'scratch_bands' : 'standard'

  if (mode === 'standard') {
    return [
      {
        id: 'primera',
        name: '1ra Categoría',
        description: 'HCP 0 - 7.9',
        color: 'bg-yellow-50 border-yellow-200',
        filter: (scorecard) => {
          if (separateLadies && scorecard.gender === 'F') return false
          const hcp = getEffectiveHcpForCategory(scorecard)
          return hcp !== null && hcp >= 0 && hcp <= 7.9
        }
      },
      {
        id: 'segunda',
        name: '2da Categoría',
        description: 'HCP 8 - 13.9',
        color: 'bg-blue-50 border-blue-200',
        filter: (scorecard) => {
          if (separateLadies && scorecard.gender === 'F') return false
          const hcp = getEffectiveHcpForCategory(scorecard)
          return hcp !== null && hcp >= 8 && hcp <= 13.9
        }
      },
      {
        id: 'tercera',
        name: '3ra Categoría',
        description: 'HCP 14 - 21.9',
        color: 'bg-green-50 border-green-200',
        filter: (scorecard) => {
          if (separateLadies && scorecard.gender === 'F') return false
          const hcp = getEffectiveHcpForCategory(scorecard)
          return hcp !== null && hcp >= 14 && hcp <= 21.9
        }
      },
      {
        id: 'cuarta',
        name: '4ta Categoría',
        description: 'HCP 22 - 53.9',
        color: 'bg-purple-50 border-purple-200',
        filter: (scorecard) => {
          if (separateLadies && scorecard.gender === 'F') return false
          const hcp = getEffectiveHcpForCategory(scorecard)
          return hcp !== null && hcp >= 22 && hcp <= 53.9
        }
      },
      ...(separateLadies
        ? ladiesByHcp
          ? [
              {
                id: 'damas_primera',
                name: 'Damas 1ra',
                description: 'HCP 0 - 7.9 (Femenino)',
                color: 'bg-pink-50 border-pink-200',
                filter: (s: any) => {
                  if (s.gender !== 'F') return false
                  const hcp = getEffectiveHcpForCategory(s)
                  return hcp !== null && hcp >= 0 && hcp <= 7.9
                }
              },
              {
                id: 'damas_segunda',
                name: 'Damas 2da',
                description: 'HCP 8 - 13.9 (Femenino)',
                color: 'bg-pink-50 border-pink-200',
                filter: (s: any) => {
                  if (s.gender !== 'F') return false
                  const hcp = getEffectiveHcpForCategory(s)
                  return hcp !== null && hcp >= 8 && hcp <= 13.9
                }
              },
              {
                id: 'damas_tercera',
                name: 'Damas 3ra',
                description: 'HCP 14 - 21.9 (Femenino)',
                color: 'bg-pink-50 border-pink-200',
                filter: (s: any) => {
                  if (s.gender !== 'F') return false
                  const hcp = getEffectiveHcpForCategory(s)
                  return hcp !== null && hcp >= 14 && hcp <= 21.9
                }
              },
              {
                id: 'damas_cuarta',
                name: 'Damas 4ta',
                description: 'HCP 22 - 53.9 (Femenino)',
                color: 'bg-pink-50 border-pink-200',
                filter: (s: any) => {
                  if (s.gender !== 'F') return false
                  const hcp = getEffectiveHcpForCategory(s)
                  return hcp !== null && hcp >= 22 && hcp <= 53.9
                }
              }
            ]
          : [
              {
                id: 'damas',
                name: 'Damas',
                description: 'Categoría Femenina (todas juntas)',
                color: 'bg-pink-50 border-pink-200',
                filter: (scorecard: any) => scorecard.gender === 'F'
              }
            ]
        : []),
      {
        id: 'no_hcp',
        name: 'Sin HCP',
        description: 'Jugadores sin Handicap',
        color: 'bg-gray-50 border-gray-200',
        filter: (scorecard) => {
          if (getEffectiveHcpForCategory(scorecard) !== null) return false
          if (separateLadies && !ladiesByHcp && scorecard.gender === 'F') return false
          return true
        }
      },
      {
        id: 'principiantes',
        name: 'Principiantes',
        description: 'Categoría Principiantes',
        color: 'bg-orange-50 border-orange-200',
        filter: (scorecard) => scorecard.category === 'principiantes'
      }
    ]
  }

  return [
    {
      id: 'scratch_general',
      name: 'Scratch (Gross)',
      description: separateLadies
        ? 'Clasificación por golpes — solo caballeros'
        : 'Clasificación por golpes (todos)',
      color: 'bg-yellow-50 border-yellow-200',
      filter: (s: any) => !separateLadies || s.gender !== 'F'
    },
    {
      id: 'band_1',
      name: '1ra (-5 a 7.9)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-blue-50 border-blue-200',
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= -5 && hcp <= 7.9
      }
    },
    {
      id: 'band_2',
      name: '2da (8 a 13.9)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-green-50 border-green-200',
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= 8 && hcp <= 13.9
      }
    },
    {
      id: 'band_3',
      name: '3ra (14 a 21.9)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-purple-50 border-purple-200',
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= 14 && hcp <= 21.9
      }
    },
    {
      id: 'band_4',
      name: '4ta (22 a 54)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-amber-50 border-amber-200',
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= 22 && hcp <= 54
      }
    },
    ...(separateLadies && ladiesByHcp
      ? [
          {
            id: 'damas_band_1',
            name: 'Damas 1ra (-5 a 7.9)',
            description: 'Femenino por neto',
            color: 'bg-pink-50 border-pink-200',
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= -5 && hcp <= 7.9
            }
          },
          {
            id: 'damas_band_2',
            name: 'Damas 2da (8 a 13.9)',
            description: 'Femenino por neto',
            color: 'bg-pink-50 border-pink-200',
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 8 && hcp <= 13.9
            }
          },
          {
            id: 'damas_band_3',
            name: 'Damas 3ra (14 a 21.9)',
            description: 'Femenino por neto',
            color: 'bg-pink-50 border-pink-200',
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 14 && hcp <= 21.9
            }
          },
          {
            id: 'damas_band_4',
            name: 'Damas 4ta (22 a 54)',
            description: 'Femenino por neto',
            color: 'bg-pink-50 border-pink-200',
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 22 && hcp <= 54
            }
          }
        ]
      : []),
    ...(separateLadies && !ladiesByHcp
      ? [
          {
            id: 'damas',
            name: 'Damas',
            description: 'Categoría femenina (todas juntas, neto)',
            color: 'bg-pink-50 border-pink-200',
            filter: (s: any) => s.gender === 'F'
          }
        ]
      : []),
    {
      id: 'no_hcp',
      name: 'Sin HCP',
      description: 'Jugadores sin Handicap',
      color: 'bg-gray-50 border-gray-200',
      filter: (s: any) => {
        if (getEffectiveHcpForCategory(s) !== null) return false
        if (separateLadies && !ladiesByHcp && s.gender === 'F') return false
        return true
      }
    }
  ]
}

export function computeResultsByCategory(
  scorecards: any[] | null | undefined,
  categories: CategoryDefinition[]
): Record<string, CategoryResult[]> {
  if (!scorecards?.length) return {}

  const uniqueScorecards = dedupeScorecardsForResults(scorecards)
  const results: Record<string, CategoryResult[]> = {}

  for (const category of categories) {
    const categoryScores = uniqueScorecards
      .filter(category.filter)
      .map((scorecard) => {
        const rawNet = computeNetForResultsRow(scorecard, category.id)
        const { front: ida, back: vuelta } = normalizeIdaVueltaForResults(scorecard)
        return {
        player_name: scorecard.player_name,
        player_type: (scorecard as any).player_type || 'member',
        handicap_local: (scorecard as any).handicap_local,
        handicap_index: scorecard.handicap_index != null ? Number(scorecard.handicap_index) : null,
        total_gross: scorecard.total_gross || 0,
        total_net: Math.round(rawNet),
        front_nine: ida,
        back_nine: vuelta,
        vuelta_last6_gross: sumGrossStrokesHoleRange(scorecard, 13, 18),
        vuelta_last3_gross: sumGrossStrokesHoleRange(scorecard, 16, 18),
        member_number: (scorecard as any).member_number,
        club_name: (scorecard as any).club_name,
        position: 0,
        }
      })
      .sort(compareCategoryResults)
      .map((result, index) => ({
        ...result,
        position: index + 1
      }))

    results[category.id] = categoryScores
  }

  const getIdKey = (r: CategoryResult | undefined) => {
    if (!r) return ''
    const keyName = sanitizeAscii(r.player_name || '').toLowerCase()
    const keyMat = (r.member_number || '').toString().trim().toLowerCase()
    return keyMat ? `m:${keyMat}` : `n:${keyName}`
  }

  const scratchWinnerGeneral = results['scratch_general'] && results['scratch_general'][0]
  const scratchGeneralKey = getIdKey(scratchWinnerGeneral)
  const computeKey = (r: CategoryResult) => getIdKey(r)

  if (results['band_1'] && scratchGeneralKey) {
    results['band_1'] = results['band_1']
      .filter((r) => computeKey(r) !== scratchGeneralKey)
      .map((r, idx) => ({ ...r, position: idx + 1 }))
  }

  return results
}
