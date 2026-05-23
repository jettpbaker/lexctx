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
  getAllChats,
  upsertChat,
  upsertChatTitle,
  getChatById,
  deleteChatById,
  getChatUsageById,
} from '~/db/queries/chats'

export { upsertRagChunks, getNearbyRagChunks, getCitationHydrationRowsByLookups } from '~/db/queries/rag-chunks'
