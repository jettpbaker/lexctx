import type { InputAudioTrack } from 'mediabunny'

import { EncodedPacketSink } from 'mediabunny'

type AacConfig = {
  objectType: number
  frequencyIndex: number
  channelConfiguration: number
}

function copyBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

function copyBufferSource(source: AllowSharedBufferSource) {
  const view = ArrayBuffer.isView(source)
    ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
    : new Uint8Array(source)

  return copyBytes(view)
}

function readBits(bytes: Uint8Array, bitOffset: number, bitCount: number) {
  let value = 0

  for (let index = 0; index < bitCount; index++) {
    const absoluteBit = bitOffset + index
    const byte = bytes[Math.floor(absoluteBit / 8)]
    const bit = byte === undefined ? 0 : (byte >> (7 - (absoluteBit % 8))) & 1

    // Append the next bit to the right side of the value we are building.
    value = (value << 1) | bit
  }

  return value
}

function parseAacConfig(description: Uint8Array): AacConfig {
  if (description.byteLength < 2) {
    throw new Error('AAC decoder config is too short')
  }

  let bitOffset = 0

  // AAC stores these values as packed bit fields in the decoder config.
  const objectType = readBits(description, bitOffset, 5)
  bitOffset += 5

  const frequencyIndex = readBits(description, bitOffset, 4)
  bitOffset += 4

  const channelConfiguration = readBits(description, bitOffset, 4)

  if (frequencyIndex === 15) {
    throw new Error('AAC custom sample rates are not supported')
  }

  return {
    objectType,
    frequencyIndex,
    channelConfiguration,
  }
}

function createAdtsHeader(config: AacConfig, frameLength: number) {
  const profile = config.objectType - 1
  const header = new Uint8Array(7)

  // ADTS is a 7-byte frame header. The first bytes are the sync/header prefix.
  header[0] = 0xff
  header[1] = 0xf1

  // The remaining fields pack AAC profile, sample rate, channels, and frame length.
  header[2] =
    ((profile & 0x03) << 6) |
    ((config.frequencyIndex & 0x0f) << 2) |
    ((config.channelConfiguration >> 2) & 0x01)
  header[3] = ((config.channelConfiguration & 0x03) << 6) | ((frameLength >> 11) & 0x03)
  header[4] = (frameLength >> 3) & 0xff
  header[5] = ((frameLength & 0x07) << 5) | 0x1f
  header[6] = 0xfc

  return header
}

export async function extractAacToAdtsFile(
  audioTrack: InputAudioTrack,
  onProgress: (progress: number) => void
): Promise<File> {
  const sink = new EncodedPacketSink(audioTrack)
  const firstPacket = await sink.getFirstPacket()
  if (!firstPacket) throw new Error('Failed to get first AAC packet')

  const decoderConfig = await audioTrack.getDecoderConfig()
  if (!decoderConfig) throw new Error('Failed to get AAC decoder config')

  const description = decoderConfig.description
  if (!description) throw new Error('AAC decoder config is missing its description')

  const config = parseAacConfig(copyBufferSource(description))
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

    // ADTS stores a small header before every AAC frame.
    chunks.push(createAdtsHeader(config, packet.data.byteLength + 7))
    chunks.push(copyBytes(packet.data))
  }

  return new File(chunks, 'audio.aac', { type: 'audio/aac' })
}
