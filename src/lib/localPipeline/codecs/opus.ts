import type { InputAudioTrack } from 'mediabunny'

import {
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  Output,
  WebMOutputFormat,
} from 'mediabunny'

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

export async function extractOpusToWebmFile(
  audioTrack: InputAudioTrack,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<File> {
  throwIfAborted(signal)

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
    throwIfAborted(signal)

    const elapsed = packet.timestamp - startTimestamp + packet.duration
    const progress = Math.floor((elapsed / duration) * 100)

    if (progress > lastReportedProgress) {
      lastReportedProgress = progress
      onProgress(progress)
      await yieldToBrowser(signal)
    }

    // WebM carries timestamps, so normalize the extracted track to start at 0.
    const adjustedPacket = packet.clone({ timestamp: packet.timestamp - startTimestamp })

    await source.add(adjustedPacket, isFirstPacket && decoderConfig ? { decoderConfig } : undefined)
    isFirstPacket = false
  }

  source.close()
  await output.finalize()

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Failed to get WebM output buffer')

  return new File([buffer], 'audio.webm', { type: 'audio/webm' })
}
