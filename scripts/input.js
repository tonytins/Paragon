const modifier = (text) => {
  const matches = PlayerActionsIn(text)
  ApplyAllInf(PLAYER_TABLE, matches)
  return { text }
}

modifier(text)
