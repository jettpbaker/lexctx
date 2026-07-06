import type { HydratedCitation, HydratedSourceLink } from '~/lib/types/citations'

import { citationId } from '~/lib/chat/citationLinks'

export function hydratedSourceLinkToCitation(source: HydratedSourceLink): HydratedCitation {
  return {
    citationId: citationId(source.sourceId, 0),
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    collectionId: '',
    collectionName: '',
    chunkIndex: 0,
    muxPlaybackId: source.muxPlaybackId,
    muxBlurDataUrl: source.muxBlurDataUrl,
    muxBlurAspectRatio: source.muxBlurAspectRatio,
    videoStatus: source.videoStatus,
    startSeconds: 0,
    endSeconds: 0,
  }
}
