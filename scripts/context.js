const modifier = (text) => {
  const report = EventsReport()
  const nothingToReport = !report
  if (nothingToReport) return { text }

  state.memory.frontMemory = report
  return { text }
}

modifier(text)
