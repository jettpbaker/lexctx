import {
  createUploadthing,
  type FileRouter as UploadThingFileRouter,
} from 'uploadthing/next'

const f = createUploadthing()

// FileRouter for your app, can contain multiple FileRoutes
export const fileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  audioUploader: f({
    audio: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: '256MB',
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => {
    // This code RUNS ON YOUR SERVER after upload
    console.log('file url', file.ufsUrl)

    // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
    return { fileUrl: file.ufsUrl }
  }),
} satisfies UploadThingFileRouter

export type FileRouter = typeof fileRouter
