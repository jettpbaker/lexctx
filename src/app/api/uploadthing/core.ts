import { createUploadthing, type FileRouter as UploadThingFileRouter } from 'uploadthing/next'
import { start } from 'workflow/api'
import z from 'zod'
import { markSourceAudioUploaded, markSourceFailed } from '~/server/actions/sources'
import { ingestSource } from '~/workflows/ingestSource'

const f = createUploadthing()

// FileRouter for your app, can contain multiple FileRoutes
export const fileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  audioUploader: f({
    audio: { maxFileSize: '256MB', maxFileCount: 1 },
  })
    .input(z.object({ sourceId: z.uuid() }))
    .middleware(({ input }) => {
      return {
        sourceId: input.sourceId,
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      // This code RUNS ON YOUR SERVER after upload
      try {
        await markSourceAudioUploaded(metadata.sourceId, file.ufsUrl, file.key)
        await start(ingestSource, [metadata.sourceId, file.ufsUrl, file.key])
      } catch (error) {
        console.error(`Error starting transcription workflow, ${error}`)
        await markSourceFailed(
          metadata.sourceId,
          error instanceof Error ? error.message : 'Audio upload failed'
        )
      }

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { fileUrl: file.ufsUrl }
    }),
} satisfies UploadThingFileRouter

export type FileRouter = typeof fileRouter
