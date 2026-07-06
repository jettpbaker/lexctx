type AbortableStage = {
  abort: () => void
}

const activeStages = new Map<string, AbortableStage[]>()

export function registerStageAbort(sourceId: string, stage: AbortableStage) {
  activeStages.set(sourceId, [...(activeStages.get(sourceId) ?? []), stage])
}

export function unregisterStageAbort(sourceId: string, stage: AbortableStage) {
  const stages = activeStages.get(sourceId)
  if (!stages) return

  const remainingStages = stages.filter((activeStage) => activeStage !== stage)
  if (remainingStages.length === 0) {
    activeStages.delete(sourceId)
    return
  }

  activeStages.set(sourceId, remainingStages)
}

export function abortPipelineStages(sourceId: string) {
  const stages = activeStages.get(sourceId)
  if (!stages) return

  activeStages.delete(sourceId)
  stages.forEach((stage) => stage.abort())
}

export function isAbortError(error: unknown) {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.name === 'UploadAbortedError')
  )
}
