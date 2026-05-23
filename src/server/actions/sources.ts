'use server'

export {
  deleteCollectionById,
  listAllCollections,
  listCollectionsWithSources,
  createCollection,
  updateCollectionNameById,
} from '~/db/queries/collections'

export {
  getSourceById,
  deleteSourceById,
  listSourcesForCollection,
  listAllSources,
  createPendingSources,
  updateSourceNameById,
  setSourceHash,
  markSourceAudioUploaded,
  removeSourceAudioMetadata,
  markSourceFailed,
  markSourceReady,
  saveMuxUploadId,
  saveMuxAssetId,
  markSourceVideoReady,
  saveMuxBlurUpPlaceholder,
  markSourceVideoFailed,
  saveFalRequestId,
  saveSourceSummary,
  getSourceIndexMetadata,
  saveSourceTranscript,
  getSourceVideoDataByIds,
} from '~/db/queries/sources'

export {
  type ChatType,
  type ChatUsage,
  type ChatUsageSummary,
  getAllChats,
  upsertChat,
  upsertChatTitle,
  getChatById,
  deleteChatById,
  getChatUsageById,
} from '~/db/queries/chats'

export {
  upsertRagChunks,
  getNearbyRagChunks,
  getCitationHydrationRowsByLookups,
  type CitationLookup,
} from '~/db/queries/rag-chunks'
