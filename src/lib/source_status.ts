/**
 * Unified source status for UI consumption.
 *
 * Real state is split across two pipelines:
 *  - Local (client): hashing → extracting → uploading. Each stage has progress.
 *  - Server (DB):    transcribing → indexing → ready.  No progress within stages.
 *
 * Local stages paint progress directly into the status label. Remote stages
 * have no numeric progress, so the label is shimmered to communicate "alive,
 * working" without inventing a percentage.
 */

import type { LocalSourceType } from '~/lib/types'

export type SourceUiStatus =
  | { kind: 'queued'; queuedFor?: 'hashing' | 'extraction' | 'upload' }
  | { kind: 'hashing'; progress: number }
  | { kind: 'extracting'; progress: number }
  | { kind: 'uploading'; progress: number }
  | { kind: 'transcribing' }
  | { kind: 'indexing' }
  | { kind: 'ready' }
  | { kind: 'failed'; failedDuring: 'upload' | 'process'; error: string }

export type LocalStageKind = 'hashing' | 'extracting' | 'uploading'
export type RemoteStageKind = 'transcribing' | 'indexing'

type DbSourceStatus = 'pending_upload' | 'transcribing' | 'indexing' | 'ready' | 'failed'

type DbSourceStatusLike = {
  status: DbSourceStatus
  error: string | null
}

export function isLocalStage(
  status: SourceUiStatus
): status is Extract<SourceUiStatus, { kind: LocalStageKind }> {
  return status.kind === 'hashing' || status.kind === 'extracting' || status.kind === 'uploading'
}

export function isRemoteStage(
  status: SourceUiStatus
): status is Extract<SourceUiStatus, { kind: RemoteStageKind }> {
  return status.kind === 'transcribing' || status.kind === 'indexing'
}

export function labelForStatus(status: SourceUiStatus): string {
  switch (status.kind) {
    case 'queued':
      return status.queuedFor ? `queued for ${status.queuedFor}` : 'queued'
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

export function dbStatusToSourceUiStatus(source: DbSourceStatusLike): SourceUiStatus {
  switch (source.status) {
    case 'pending_upload':
      return { kind: 'queued' }
    case 'transcribing':
      return { kind: 'transcribing' }
    case 'indexing':
      return { kind: 'indexing' }
    case 'ready':
      return { kind: 'ready' }
    case 'failed':
      return {
        kind: 'failed',
        failedDuring: 'process',
        error: source.error ?? 'Source processing failed',
      }
  }
}

export function localAudioStatusToSourceUiStatus(source: LocalSourceType): SourceUiStatus {
  switch (source.audioStatus.stage) {
    case 'hashing-queued':
      return { kind: 'queued', queuedFor: 'hashing' }
    case 'extraction-queued':
      return { kind: 'queued', queuedFor: 'extraction' }
    case 'upload-queued':
      return { kind: 'queued', queuedFor: 'upload' }
    case 'uploaded':
      return { kind: 'queued' }
    case 'hashing':
      return { kind: 'hashing', progress: source.audioStatus.progress / 100 }
    case 'extracting':
      return { kind: 'extracting', progress: source.audioStatus.progress / 100 }
    case 'uploading':
      return { kind: 'uploading', progress: source.audioStatus.progress / 100 }
    case 'failed':
      return {
        kind: 'failed',
        failedDuring: 'upload',
        error: source.audioStatus.error,
      }
  }
}

export function shouldUseLocalSourceStatus(source: LocalSourceType): boolean {
  return source.audioStatus.stage !== 'uploaded'
}

export function isInFlight(status: SourceUiStatus): boolean {
  return status.kind !== 'ready' && status.kind !== 'failed'
}

export type CollectionStatusSummary = {
  total: number
  ready: number
  failed: number
  inFlight: number
}

export function summarizeStatuses(statuses: readonly SourceUiStatus[]): CollectionStatusSummary {
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
