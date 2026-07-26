const modifier = (text) => {
  const npcMatches = NpcActionsIn(text)
  ApplyAllInf(NPC_TABLE, npcMatches)

  const miscMatches = MiscActionsIn(text)
  ApplyAllInf(PASSIVE_TABLE, miscMatches)

  return { text }
}

modifier(text)
