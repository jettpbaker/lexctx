import type { InputAudioTrack } from 'mediabunny'

import { EncodedPacketSink } from 'mediabunny'

function copyBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
}

function yieldToBrowser(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, 0)

    function abort() {
      clearTimeout(timeoutId)
      reject(new DOMException('aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', abort, { once: true })
  })
}

export async function extractMp3File(
  audioTrack: InputAudioTrack,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<File> {
  throwIfAborted(signal)

  const sink = new EncodedPacketSink(audioTrack)
  const firstPacket = await sink.getFirstPacket()
  if (!firstPacket) throw new Error('Failed to get first MP3 packet')

  const chunks: BlobPart[] = []
  const startTimestamp = firstPacket.timestamp
  const duration = await audioTrack.computeDuration()

  let lastReportedProgress = 0

  for await (const packet of sink.packets(firstPacket)) {
    throwIfAborted(signal)

    const elapsed = packet.timestamp - startTimestamp + packet.duration
    const progress = Math.floor((elapsed / duration) * 100)

    if (progress > lastReportedProgress) {
      lastReportedProgress = progress
      onProgress(progress)
      await yieldToBrowser(signal)
    }

    // MP3 frames are self-framing, so the packet payloads can be concatenated.
    chunks.push(copyBytes(packet.data))
  }

  return new File(chunks, 'audio.mp3', { type: 'audio/mpeg' })
}
