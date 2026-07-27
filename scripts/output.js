const modifier = (text) => {
  const npcMatches = NpcActionsIn(text)
  ApplyAllInf(NPC_TABLE, npcMatches)

  const passiveMatches = PassiveActionsIn(text)
  ApplyAllInf(PASSIVE_TABLE, passiveMatches)

  const purchaseMatches = PurchasesIn(text)
  ApplyAllPurchases(purchaseMatches)

  return { text }
}

modifier(text)
