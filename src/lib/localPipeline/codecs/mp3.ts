import type { InputAudioTrack } from 'mediabunny'

import { EncodedPacketSink } from 'mediabunny'

function copyBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

export async function extractMp3File(
  audioTrack: InputAudioTrack,
  onProgress: (progress: number) => void
): Promise<File> {
  const sink = new EncodedPacketSink(audioTrack)
  const firstPacket = await sink.getFirstPacket()
  if (!firstPacket) throw new Error('Failed to get first MP3 packet')

  const chunks: BlobPart[] = []
  const startTimestamp = firstPacket.timestamp
  const duration = await audioTrack.computeDuration()

  let lastReportedProgress = 0

  for await (const packet of sink.packets(firstPacket)) {
    const elapsed = packet.timestamp - startTimestamp + packet.duration
    const progress = Math.floor((elapsed / duration) * 100)

    if (progress > lastReportedProgress) {
      lastReportedProgress = progress
      onProgress(progress)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }

    // MP3 frames are self-framing, so the packet payloads can be concatenated.
    chunks.push(copyBytes(packet.data))
  }

  return new File(chunks, 'audio.mp3', { type: 'audio/mpeg' })
}
