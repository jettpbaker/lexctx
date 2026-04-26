import { ALL_FORMATS, BlobSource, Input } from 'mediabunny'

import { extractAacToAdtsFile } from './codecs/aac'
import { extractMp3File } from './codecs/mp3'
import { extractOpusToWebmFile } from './codecs/opus'

export default async function extractAudioFile(
  video: File,
  onProgress: (progress: number) => void
): Promise<File> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(video),
  })

  const audioTrack = await input.getPrimaryAudioTrack()
  const codec = audioTrack?.codec

  if (!audioTrack || !codec) {
    throw new Error('Could not find an audio track in this file')
  }

  if (codec === 'aac') {
    return extractAacToAdtsFile(audioTrack, onProgress)
  }

  if (codec === 'mp3') {
    return extractMp3File(audioTrack, onProgress)
  }

  if (codec === 'opus') {
    return extractOpusToWebmFile(audioTrack, onProgress)
  }

  throw new Error(`Unsupported audio codec: ${codec}`)
}
