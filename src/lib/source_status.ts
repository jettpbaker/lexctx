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

/**
 * Secondary status for video upload/processing.
 *
 * Decoupled from `SourceUiStatus` because chat readiness (audio → transcript →
 * embeddings) does not depend on video. The row's primary label tracks chat
 * readiness; this drives a smaller, demoted chip so users can see "chat is
 * usable, video is still uploading/processing" at a glance.
 *
 * `pending` and `ready` render nothing — quiet by design when there's nothing
 * to communicate.
 */
export type VideoUiStatus =
  | { kind: 'pending' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'processing' }
  | { kind: 'ready' }
  | { kind: 'failed'; error: string }

export type LocalStageKind = 'hashing' | 'extracting' | 'uploading'
export type RemoteStageKind = 'transcribing' | 'indexing'

type DbSourceStatus = 'pending_upload' | 'transcribing' | 'indexing' | 'ready' | 'failed'
type DbVideoStatus = 'pending_upload' | 'uploading' | 'processing' | 'ready' | 'failed'

type DbSourceStatusLike = {
  status: DbSourceStatus
  error: string | null
}

type DbVideoStatusLike = {
  videoStatus: DbVideoStatus
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

export function dbVideoStatusToVideoUiStatus(source: DbVideoStatusLike): VideoUiStatus {
  switch (source.videoStatus) {
    case 'pending_upload':
      return { kind: 'pending' }
    case 'uploading':
      // Server knows we're uploading but doesn't track progress; the local
      // store has the real number when relevant (see `mergeVideoStatus`).
      return { kind: 'uploading', progress: 0 }
    case 'processing':
      return { kind: 'processing' }
    case 'ready':
      return { kind: 'ready' }
    case 'failed':
      return { kind: 'failed', error: source.error ?? 'Video processing failed' }
  }
}

export function localVideoStatusToVideoUiStatus(source: LocalSourceType): VideoUiStatus {
  switch (source.videoStatus.stage) {
    case 'pending':
      return { kind: 'pending' }
    case 'uploading':
      return { kind: 'uploading', progress: source.videoStatus.progress / 100 }
    case 'uploaded':
      // Local upload finished; server flips DB to `processing` shortly after.
      return { kind: 'processing' }
    case 'failed':
      return { kind: 'failed', error: source.videoStatus.error }
  }
}

/**
 * Combine DB and local video state into a single UI chip status.
 *
 * Local takes priority while it's authoritative (active upload or local
 * failure) and bridges the brief window where the local upload has finished
 * but the server hasn't yet been told to start monitoring Mux.
 */
export function mergeVideoStatus(
  source: DbVideoStatusLike,
  local: LocalSourceType | undefined
): VideoUiStatus {
  if (local?.videoStatus.stage === 'uploading') {
    return { kind: 'uploading', progress: local.videoStatus.progress / 100 }
  }
  if (local?.videoStatus.stage === 'failed') {
    return { kind: 'failed', error: local.videoStatus.error }
  }

  const localFinished = local?.videoStatus.stage === 'uploaded'
  if (
    localFinished &&
    (source.videoStatus === 'pending_upload' || source.videoStatus === 'uploading')
  ) {
    return { kind: 'processing' }
  }

  return dbVideoStatusToVideoUiStatus(source)
}

export function isVideoChipVisible(status: VideoUiStatus): boolean {
  return status.kind !== 'pending' && status.kind !== 'ready'
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
