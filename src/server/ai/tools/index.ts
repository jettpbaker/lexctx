import { getNearbyRagChunksTool } from './getNearbyRagChunks'
import { listCollectionsTool } from './listCollections'
import { listSourcesForCollectionTool, listSourcesTool } from './listSources'
import { readWebPageTool } from './readWebPage'
import { sourceSearchTool } from './sourceSearch'
import { webSearchTool } from './webSearch'

export const chatTools = {
  sourceSearch: sourceSearchTool,
  getNearbyRagChunks: getNearbyRagChunksTool,
  listSources: listSourcesTool,
  listSourcesForCollection: listSourcesForCollectionTool,
  listCollections: listCollectionsTool,
  webSearch: webSearchTool,
  readWebPage: readWebPageTool,
}
