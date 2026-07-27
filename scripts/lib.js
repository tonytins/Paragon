// Library

// inf: internal name for the currency. The user-facing label shifts between
// three flavors depending on which action drove the last change:
//   'influence'   - default, used when no entry specifies otherwise
//   'information' - public recognition, press, exposure
//   'infamy'      - notoriety gained through bold, public heroics
// Inf is capped, and doubles as spendable currency: NPCs can sell items
// for an inf cost, same as money.
const DEFAULT_INF_TYPE = 'influence'
const STARTING_INF = 0
const INF_CAP = 2000000000

// Player's own actions, detected in the player's input.
const PLAYER_TABLE = {
  rescue: { base: 5, modifiers: { civilian: 3, child: 5 } },
  intervene: { base: 4, modifiers: { robbery: 3, hostage: 6 } },
  patrol: { base: 2, modifiers: { rooftop: 1, alley: 1 } },
  train: { base: 3, modifiers: { sidekick: 2 } },
  deflect: { base: 2, modifiers: { blame: 3 } },
  broadcast: { base: 6, modifiers: { warning: 3 }, infType: 'information' },
}

// NPC actions directed at/around the player, detected in the AI's output.
// Requires an NPC pronoun (he/she/they, etc.) nearby to activate. A
// capitalized name nearby is captured for attribution.
const NPC_TABLE = {
  thank: { base: 4, modifiers: { publicly: 3, tearfully: 2 } },
  interview: { base: 5, modifiers: { reporter: 3 }, infType: 'information' },
  recruit: { base: 6, modifiers: { league: 4, agency: 3 } },
  warn: { base: 3, modifiers: { civilians: 2 } },
  celebrate: { base: 7, modifiers: { city: 4, parade: 3 }, infType: 'information' },
  mentor: { base: 4, modifiers: { patiently: 2 } },
}

// Ambient/passive things that happen around the player, detected in the
// AI's output. Same NPC pronoun gate as NPC_TABLE, but no name capture,
// there's no clear actor to attribute it to.
const PASSIVE_TABLE = {
  see: { base: 1, modifiers: { symbol: 3, cape: 1 } },
  notice: { base: 1, modifiers: { pattern: 2 } },
  admire: { base: 2, modifiers: { courage: 3 } },
}

// Items NPCs can sell the player. Cost is a flat inf price, no modifiers,
// buying something is a single transaction rather than a scored action.
const ITEM_TABLE = {
  gadget: 150,
  drone: 250,
  suit: 400,
  vehicle: 800,
  safehouse: 600,
  informant: 100,
}

const MODIFIER_SEARCH_WINDOW = 40
const SUBJECT_SEARCH_WINDOW = 30
const ITEM_SEARCH_WINDOW = 40
const NPC_PRONOUN_REGEX = /\b(he|she|they|him|her|them|his|hers|their)\b/i
const PURCHASE_VERB_REGEX = /\b(buy|buys|bought|purchase|purchases|purchased|trade|trades|traded)\b/i

function modifierNear(table, text, verb, verbIndex) {
  const modifierWords = Object.keys(table[verb].modifiers)
  const noModifiers = modifierWords.length === 0
  if (noModifiers) return null

  const window = text.slice(verbIndex, verbIndex + MODIFIER_SEARCH_WINDOW)
  const modifierRegex = new RegExp(`\\b(${modifierWords.join('|')})\\b`, 'i')
  const modifierMatch = window.match(modifierRegex)

  if (modifierMatch) log(`modifierNear: found "${modifierMatch[1]}" near "${verb}"`)
  return modifierMatch ? modifierMatch[1] : null
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
  const modifier = modifierNear(table, lower, verb, verbIndex)
  return { verb, modifier, index: verbIndex }
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

function PassiveActionsIn(text) {
  const matches = allVerbMatches(PASSIVE_TABLE, text)
  const resolved = matches.map((match) => resolveMatch(PASSIVE_TABLE, text, match.verb, match.index))

  return resolved.filter((match) => requirePronounGate(text, match))
}

function itemNear(text, verbIndex) {
  const itemNames = Object.keys(ITEM_TABLE)
  const window = text.slice(verbIndex, verbIndex + ITEM_SEARCH_WINDOW)
  const itemRegex = new RegExp(`\\b(${itemNames.join('|')})\\b`, 'i')
  const itemMatch = window.match(itemRegex)

  if (itemMatch) log(`itemNear: found item "${itemMatch[1]}" near purchase verb`)
  return itemMatch ? itemMatch[1] : null
}

function PurchasesIn(text) {
  const lower = text.toLowerCase()
  const verbMatches = [...lower.matchAll(new RegExp(PURCHASE_VERB_REGEX, 'gi'))]

  log(`PurchasesIn: found ${verbMatches.length} purchase verb match(es)`)
  return verbMatches
    .map((match) => ({ item: itemNear(lower, match.index), index: match.index }))
    .filter((match) => match.item !== null)
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

function InfDeltaFor(table, verb, modifier) {
  const entry = table[verb]
  const noEntry = !entry
  if (noEntry) return 0

  const modifierBonus = modifier ? entry.modifiers[modifier] || 0 : 0
  return entry.base + modifierBonus
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
  const uncapped = previousBalance + delta
  state.inf = Math.max(0, Math.min(INF_CAP, uncapped))
  state.pendingInfDelta = pendingDelta() + (state.inf - previousBalance)
  log(`ApplyInf: ${previousBalance} -> ${state.inf} (delta ${delta})`)
}

function ApplyAllInf(table, matches) {
  for (const match of matches) {
    const entry = table[match.verb]
    if (entry.infType) SetInfType(entry.infType)
    ApplyInf(InfDeltaFor(table, match.verb, match.modifier))
  }
}

function Inventory() {
  const unset = state.inventory === undefined
  if (unset) state.inventory = []
  return state.inventory
}

function pendingPurchaseNotes() {
  const unset = state.pendingPurchaseNotes === undefined
  if (unset) state.pendingPurchaseNotes = []
  return state.pendingPurchaseNotes
}

function AddToInventory(item) {
  Inventory().push(item)
  log(`AddToInventory: added "${item}", inventory now [${Inventory().join(', ')}]`)
}

function ApplyPurchase(match) {
  const cost = ITEM_TABLE[match.item]
  const balance = InfBalance()
  const canAfford = balance >= cost

  if (!canAfford) {
    log(`ApplyPurchase: can't afford "${match.item}" (cost ${cost}, have ${balance})`)
    pendingPurchaseNotes().push(`not enough ${InfType()} for a ${match.item} (need ${cost}, have ${balance})`)
    return
  }

  state.inf = balance - cost
  AddToInventory(match.item)
  pendingPurchaseNotes().push(`bought a ${match.item} for ${cost} ${InfType()}`)
  log(`ApplyPurchase: bought "${match.item}" for ${cost}, balance now ${state.inf}`)
}

function ApplyAllPurchases(matches) {
  for (const match of matches) ApplyPurchase(match)
}

function InfChangeReport() {
  const delta = pendingDelta()
  const noChange = delta === 0
  if (noChange) return ''

  const direction = delta > 0 ? 'gained' : 'lost'
  return `You ${direction} ${Math.abs(delta)} ${InfType()}.`
}

function PurchaseReport() {
  const notes = pendingPurchaseNotes()
  const nothingToReport = notes.length === 0
  if (nothingToReport) return ''

  return notes.map((note) => `You ${note}.`).join(' ')
}

function EventsReport() {
  const parts = [InfChangeReport(), PurchaseReport()].filter(Boolean)
  const nothingToReport = parts.length === 0
  if (nothingToReport) {
    log('EventsReport: nothing pending, skipping report')
    return ''
  }

  const report = `[${parts.join(' ')}]`
  log(`EventsReport: reporting "${report}"`)
  state.pendingInfDelta = 0
  state.pendingPurchaseNotes = []
  return report
}
