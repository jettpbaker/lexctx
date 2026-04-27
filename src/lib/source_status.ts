/**
 * Unified source status for UI consumption.
 *
 * Real state is split across two pipelines:
 *  - Local (client): hashing → extracting → uploading. Each stage has progress.
 *  - Server (DB):    transcribing → indexing → ready.  No progress within stages.
 *
 * The row shows a thin progress bar that resets per local stage, plus a status
 * label. Remote stages have no numeric progress, so the label is shimmered to
 * communicate "alive, working" without inventing a percentage.
 */

export type SourceUiStatus =
  | { kind: 'queued' }
  | { kind: 'hashing'; progress: number }
  | { kind: 'extracting'; progress: number }
  | { kind: 'uploading'; progress: number }
  | { kind: 'transcribing' }
  | { kind: 'indexing' }
  | { kind: 'ready' }
  | { kind: 'failed'; failedDuring: 'upload' | 'process'; error: string }

export type LocalStageKind = 'hashing' | 'extracting' | 'uploading'
export type RemoteStageKind = 'transcribing' | 'indexing'

export function isLocalStage(
  status: SourceUiStatus
): status is Extract<SourceUiStatus, { kind: LocalStageKind }> {
  return (
    status.kind === 'hashing' ||
    status.kind === 'extracting' ||
    status.kind === 'uploading'
  )
}

export function isRemoteStage(
  status: SourceUiStatus
): status is Extract<SourceUiStatus, { kind: RemoteStageKind }> {
  return status.kind === 'transcribing' || status.kind === 'indexing'
}

export function labelForStatus(status: SourceUiStatus): string {
  switch (status.kind) {
    case 'queued':
      return 'queued'
    case 'hashing':
      return 'hashing'
    case 'extracting':
      return 'extracting'
    case 'uploading':
      return 'uploading'
    case 'transcribing':
      return 'transcribing'
    case 'indexing':
      return 'indexing'
    case 'ready':
      return 'ready'
    case 'failed':
      return 'failed'
  }
}

export function isInFlight(status: SourceUiStatus): boolean {
  return status.kind !== 'ready' && status.kind !== 'failed'
}

/** Aggregate counts for the collection header. */
export type CollectionStatusSummary = {
  total: number
  ready: number
  failed: number
  inFlight: number
}

export function summarizeStatuses(
  statuses: readonly SourceUiStatus[]
): CollectionStatusSummary {
  let ready = 0
  let failed = 0
  let inFlight = 0
  for (const status of statuses) {
    if (status.kind === 'ready') ready++
    else if (status.kind === 'failed') failed++
    else inFlight++
  }
  return { total: statuses.length, ready, failed, inFlight }
}
