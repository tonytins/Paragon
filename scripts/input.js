const modifier = (text) => {
  const actionMatches = PlayerActionsIn(text)
  ApplyAllInf(PLAYER_TABLE, actionMatches)

  const purchaseMatches = PurchasesIn(text)
  ApplyAllPurchases(purchaseMatches)

  return { text }
}

modifier(text)
