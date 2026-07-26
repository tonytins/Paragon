// Library

// inf: internal name for the currency. The user-facing label shifts between
// three flavors depending on which action drove the last change:
//   'influence'   - default, used when no entry specifies otherwise
//   'information' - public recognition, press, exposure
//   'infamy'      - collateral damage, cover-ups, villainy
const DEFAULT_INF_TYPE = 'influence'

// Player's own actions, detected in the player's input.
const PLAYER_TABLE = {
  unmask: { base: -8, nouns: { publicly: -7, accidentally: -3 }, infType: 'infamy' },
  smash: { base: -3, nouns: { building: -5, car: -2 } },
  rescue: { base: 5, nouns: { civilian: 3, child: 5 } },
  intervene: { base: 4, nouns: { robbery: 3, hostage: 6 } },
  interrogate: { base: -2, nouns: { roughly: -4 } },
  patrol: { base: 2, nouns: { rooftop: 1, alley: 1 } },
  train: { base: 3, nouns: { sidekick: 2 } },
  deflect: { base: 2, nouns: { blame: 3 } },
  broadcast: { base: 6, nouns: { warning: 3, confession: -5 }, infType: 'information' },
  vanish: { base: -1, nouns: { scene: -2 } },
}

// NPC actions directed at/around the player, detected in the AI's output.
// Requires an NPC pronoun (he/she/they, etc.) nearby to activate. A
// capitalized name nearby is captured for attribution.
const NPC_TABLE = {
  thank: { base: 4, nouns: { publicly: 3, tearfully: 2 } },
  accuse: { base: -6, nouns: { falsely: -3, reporter: -2 }, infType: 'infamy' },
  interview: { base: 5, nouns: { reporter: 3 }, infType: 'information' },
  expose: { base: -10, nouns: { identity: -8 }, infType: 'infamy' },
  recruit: { base: 6, nouns: { league: 4, agency: 3 } },
  betray: { base: -12, nouns: { ally: -5 }, infType: 'infamy' },
  warn: { base: 3, nouns: { civilians: 2 } },
  frame: { base: -8, nouns: { crime: -6 }, infType: 'infamy' },
  celebrate: { base: 7, nouns: { city: 4, parade: 3 }, infType: 'information' },
  investigate: { base: -3, nouns: { detective: -2 } },
}

// Ambient/passive things that happen around the player (seeing, noticing),
// detected in the AI's output. Same NPC pronoun gate as NPC_TABLE, but no
// name capture, there's no clear actor to attribute it to.
const PASSIVE_TABLE = {
  see: { base: 1, nouns: { symbol: 3, cape: 1 } },
  notice: { base: 1, nouns: { pattern: 2 } },
  whisper: { base: -1, nouns: { rumor: -2 } },
  ignore: { base: -1, nouns: {} },
  fear: { base: -2, nouns: { power: -3 } },
  admire: { base: 2, nouns: { courage: 3 } },
}

const STARTING_INF = 0
const NOUN_SEARCH_WINDOW = 40
const SUBJECT_SEARCH_WINDOW = 30
const NPC_PRONOUN_REGEX = /\b(he|she|they|him|her|them|his|hers|their)\b/i

function nounNear(table, text, verb, verbIndex) {
  const nouns = Object.keys(table[verb].nouns)
  const noNouns = nouns.length === 0
  if (noNouns) return null

  const window = text.slice(verbIndex, verbIndex + NOUN_SEARCH_WINDOW)
  const nounRegex = new RegExp(`\\b(${nouns.join('|')})\\b`, 'i')
  const nounMatch = window.match(nounRegex)

  if (nounMatch) log(`nounNear: found "${nounMatch[1]}" near "${verb}"`)
  return nounMatch ? nounMatch[1] : null
}

function allNamesNear(originalText, verbIndex) {
  const start = Math.max(0, verbIndex - SUBJECT_SEARCH_WINDOW)
  const window = originalText.slice(start, verbIndex)
  const nameRegex = /\b[A-Z][a-z]+\b/g
  return window.match(nameRegex) || []
}

function closestNpcNameBefore(originalText, verbIndex) {
  const names = allNamesNear(originalText, verbIndex)
  const closest = names[names.length - 1] || null

  if (closest) log(`closestNpcNameBefore: found NPC name "${closest}"`)
  return closest
}

function npcPronounNear(text, verbIndex) {
  const start = Math.max(0, verbIndex - SUBJECT_SEARCH_WINDOW)
  const window = text.slice(start, verbIndex)
  const pronounMatch = window.match(NPC_PRONOUN_REGEX)

  if (pronounMatch) log(`npcPronounNear: found "${pronounMatch[1]}" before verb`)
  return pronounMatch ? pronounMatch[1] : null
}

function allVerbMatches(table, text) {
  const lower = text.toLowerCase()
  const verbNames = Object.keys(table)
  const verbRegex = new RegExp(`\\b(${verbNames.join('|')})\\b`, 'gi')
  const matches = [...lower.matchAll(verbRegex)]

  log(`allVerbMatches: found ${matches.length} verb match(es)`)
  return matches.map((match) => ({ verb: match[1], index: match.index }))
}

function resolveMatch(table, originalText, verb, verbIndex) {
  const lower = originalText.toLowerCase()
  const noun = nounNear(table, lower, verb, verbIndex)
  return { verb, noun, index: verbIndex }
}

function PlayerActionsIn(text) {
  const matches = allVerbMatches(PLAYER_TABLE, text)
  return matches.map((match) => resolveMatch(PLAYER_TABLE, text, match.verb, match.index))
}

function requirePronounGate(text, match) {
  const pronoun = npcPronounNear(text, match.index)
  const noPronoun = !pronoun
  if (noPronoun) {
    log(`requirePronounGate: "${match.verb}" skipped, no NPC pronoun nearby`)
    return false
  }
  return true
}

function NpcActionsIn(text) {
  const matches = allVerbMatches(NPC_TABLE, text)
  const resolved = matches.map((match) => resolveMatch(NPC_TABLE, text, match.verb, match.index))

  return resolved
    .filter((match) => requirePronounGate(text, match))
    .map((match) => ({ ...match, npc: closestNpcNameBefore(text, match.index) }))
}

function MiscActionsIn(text) {
  const matches = allVerbMatches(PASSIVE_TABLE, text)
  const resolved = matches.map((match) => resolveMatch(PASSIVE_TABLE, text, match.verb, match.index))

  return resolved.filter((match) => requirePronounGate(text, match))
}

function InfBalance() {
  const unset = state.inf === undefined
  if (unset) state.inf = STARTING_INF
  return state.inf
}

function InfType() {
  const unset = state.infType === undefined
  if (unset) state.infType = DEFAULT_INF_TYPE
  return state.infType
}

function SetInfType(type) {
  const unchanged = type === state.infType
  if (unchanged) return

  log(`SetInfType: ${InfType()} -> ${type}`)
  state.infType = type
}

function InfDeltaFor(table, verb, noun) {
  const entry = table[verb]
  const noEntry = !entry
  if (noEntry) return 0

  const nounBonus = noun ? entry.nouns[noun] || 0 : 0
  return entry.base + nounBonus
}

function pendingDelta() {
  const unset = state.pendingInfDelta === undefined
  if (unset) state.pendingInfDelta = 0
  return state.pendingInfDelta
}

function ApplyInf(delta) {
  const nothingToApply = delta === 0
  if (nothingToApply) return

  const previousBalance = InfBalance()
  state.inf = previousBalance + delta
  state.pendingInfDelta = pendingDelta() + delta
  log(`ApplyInf: ${previousBalance} -> ${state.inf} (delta ${delta})`)
}

function ApplyAllInf(table, matches) {
  for (const match of matches) {
    const entry = table[match.verb]
    if (entry.infType) SetInfType(entry.infType)
    ApplyInf(InfDeltaFor(table, match.verb, match.noun))
  }
}

function InfChangeReport() {
  const delta = pendingDelta()
  const noChange = delta === 0
  if (noChange) {
    log('InfChangeReport: nothing pending, skipping report')
    return ''
  }

  const direction = delta > 0 ? 'gained' : 'lost'
  const report = `[You ${direction} ${Math.abs(delta)} ${InfType()}.]`
  log(`InfChangeReport: reporting "${report}"`)
  state.pendingInfDelta = 0
  return report
}
