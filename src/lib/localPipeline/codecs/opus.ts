import type { InputAudioTrack } from 'mediabunny'

import {
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  Output,
  WebMOutputFormat,
} from 'mediabunny'

export async function extractOpusToWebmFile(
  audioTrack: InputAudioTrack,
  onProgress: (progress: number) => void
): Promise<File> {
  const sink = new EncodedPacketSink(audioTrack)
  const firstPacket = await sink.getFirstPacket()
  if (!firstPacket) throw new Error('Failed to get first Opus packet')

  const decoderConfig = await audioTrack.getDecoderConfig()
  if (!decoderConfig) throw new Error('Failed to get Opus decoder config')

  const source = new EncodedAudioPacketSource('opus')
  const output = new Output({
    format: new WebMOutputFormat(),
    target: new BufferTarget(),
  })

  output.addAudioTrack(source)
  await output.start()

  const startTimestamp = firstPacket.timestamp
  const duration = await audioTrack.computeDuration()

  let isFirstPacket = true
  let lastReportedProgress = 0

  for await (const packet of sink.packets(firstPacket)) {
    const elapsed = packet.timestamp - startTimestamp + packet.duration
    const progress = Math.floor((elapsed / duration) * 100)

    if (progress > lastReportedProgress) {
      lastReportedProgress = progress
      onProgress(progress)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }

    // WebM carries timestamps, so normalize the extracted track to start at 0.
    const adjustedPacket = packet.clone({ timestamp: packet.timestamp - startTimestamp })

    await source.add(
      adjustedPacket,
      isFirstPacket && decoderConfig ? { decoderConfig } : undefined
    )
    isFirstPacket = false
  }

  source.close()
  await output.finalize()

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Failed to get WebM output buffer')

  return new File([buffer], 'audio.webm', { type: 'audio/webm' })
}
