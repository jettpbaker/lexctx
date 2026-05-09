type AbortableVideoUpload = {
  abort: () => void
}

const activeVideoUploads = new Map<string, AbortableVideoUpload>()

export function registerVideoUpload(sourceId: string, upload: AbortableVideoUpload) {
  activeVideoUploads.set(sourceId, upload)
}

export function unregisterVideoUpload(sourceId: string) {
  activeVideoUploads.delete(sourceId)
}

export function abortVideoUpload(sourceId: string) {
  const upload = activeVideoUploads.get(sourceId)
  if (!upload) return

  upload.abort()
  activeVideoUploads.delete(sourceId)
}
