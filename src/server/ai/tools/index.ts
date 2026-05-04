import { getNearbyRagChunksTool } from './getNearbyRagChunks'
import { listCollectionsTool } from './listCollections'
import { listSourcesTool } from './listSources'
import { readWebPageTool } from './readWebPage'
import { sourceSearchTool } from './sourceSearch'
import { webSearchTool } from './webSearch'

export const chatTools = {
  sourceSearch: sourceSearchTool,
  getNearbyRagChunks: getNearbyRagChunksTool,
  listSources: listSourcesTool,
  listCollections: listCollectionsTool,
  webSearch: webSearchTool,
  readWebPage: readWebPageTool,
}
