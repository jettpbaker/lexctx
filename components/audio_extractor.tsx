'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { AudioCodec, OutputFormat } from 'mediabunny'
import {
  AdtsOutputFormat,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  FlacOutputFormat,
  Input,
  type InputAudioTrack,
  Mp3OutputFormat,
  Mp4OutputFormat,
  Output,
  WavOutputFormat,
  WebMOutputFormat,
  canEncodeAudio,
} from 'mediabunny'

import { Button } from '@/components/ui/button'

type ExtractedAudio = {
  codec: AudioCodec | null
  duration: number
  elapsedMs: number
  fileName: string
  mode: 'extract' | 'compress'
  mimeType: string
  size: number
  strategy: 'copy' | 'fallback' | 'fast-aac'
  url: string
}

type OutputChoice = {
  format: OutputFormat
  mimeType: string
  extension: string
  strategy: ExtractedAudio['strategy']
}

const pcmCodecs = new Set<AudioCodec>([
  'pcm-s16',
  'pcm-s16be',
  'pcm-s24',
  'pcm-s24be',
  'pcm-s32',
  'pcm-s32be',
  'pcm-f32',
  'pcm-f32be',
  'pcm-f64',
  'pcm-f64be',
  'pcm-u8',
  'pcm-s8',
  'ulaw',
  'alaw',
])

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return 'Unknown duration'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatElapsed(milliseconds: number) {
  if (!milliseconds) return '0.0s'

  return `${(milliseconds / 1000).toFixed(1)}s`
}

function baseName(fileName: string) {
  const lastDot = fileName.lastIndexOf('.')

  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName
}

function getOutputChoice(codec: AudioCodec | null): OutputChoice {
  if (codec === 'aac') {
    return {
      format: new Mp4OutputFormat({ fastStart: false }),
      mimeType: 'audio/mp4',
      extension: '.m4a',
      strategy: 'copy',
    }
  }

  if (codec === 'mp3') {
    return {
      format: new Mp3OutputFormat({ xingHeader: false }),
      mimeType: 'audio/mpeg',
      extension: '.mp3',
      strategy: 'copy',
    }
  }

  if (codec === 'opus' || codec === 'vorbis') {
    return {
      format: new WebMOutputFormat(),
      mimeType: 'audio/webm',
      extension: '.webm',
      strategy: 'copy',
    }
  }

  if (codec === 'flac') {
    return {
      format: new FlacOutputFormat(),
      mimeType: 'audio/flac',
      extension: '.flac',
      strategy: 'copy',
    }
  }

  if (codec && pcmCodecs.has(codec)) {
    return {
      format: new WavOutputFormat({ large: true }),
      mimeType: 'audio/wav',
      extension: '.wav',
      strategy: 'copy',
    }
  }

  if (codec === 'ac3' || codec === 'eac3') {
    return {
      format: new AdtsOutputFormat(),
      mimeType: 'audio/aac',
      extension: '.aac',
      strategy: 'fallback',
    }
  }

  return {
    format: new WavOutputFormat({ large: true }),
    mimeType: 'audio/wav',
    extension: '.wav',
    strategy: 'fallback',
  }
}

function canKeepCodec(format: OutputFormat, codec: AudioCodec | null) {
  return codec ? format.getSupportedAudioCodecs().includes(codec) : false
}

const aacFrequencyTable = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
  8000, 7350,
]

type AacConfig = {
  channelConfiguration: number
  frequencyIndex: number
  objectType: number
}

function readBits(bytes: Uint8Array, bitOffset: number, bitCount: number) {
  let value = 0

  for (let index = 0; index < bitCount; index++) {
    const absoluteBit = bitOffset + index
    const byte = bytes[Math.floor(absoluteBit / 8)]
    const bit = byte === undefined ? 0 : (byte >> (7 - (absoluteBit % 8))) & 1

    value = (value << 1) | bit
  }

  return value
}

function parseAacConfig(description: Uint8Array): AacConfig {
  if (description.byteLength < 2) {
    throw new Error('AAC decoder config is too short.')
  }

  let bitOffset = 0
  let objectType = readBits(description, bitOffset, 5)
  bitOffset += 5

  if (objectType === 31) {
    objectType = 32 + readBits(description, bitOffset, 6)
    bitOffset += 6
  }

  const frequencyIndex = readBits(description, bitOffset, 4)
  bitOffset += 4

  if (frequencyIndex === 15) {
    throw new Error(
      'AAC custom sample rates are not supported by the fast path.'
    )
  }

  const channelConfiguration = readBits(description, bitOffset, 4)

  if (!aacFrequencyTable[frequencyIndex]) {
    throw new Error('AAC sample rate is not supported by the fast path.')
  }

  if (channelConfiguration < 1 || channelConfiguration > 7) {
    throw new Error('AAC channel layout is not supported by the fast path.')
  }

  return { channelConfiguration, frequencyIndex, objectType }
}

function createAdtsHeader(config: AacConfig, frameLength: number) {
  const profile = config.objectType - 1

  if (profile < 0 || profile > 3) {
    throw new Error(
      'Only AAC profiles that fit ADTS are supported by the fast path.'
    )
  }

  const header = new Uint8Array(7)

  header[0] = 0xff
  header[1] = 0xf1
  header[2] =
    ((profile & 0x03) << 6) |
    ((config.frequencyIndex & 0x0f) << 2) |
    ((config.channelConfiguration >> 2) & 0x01)
  header[3] =
    ((config.channelConfiguration & 0x03) << 6) | ((frameLength >> 11) & 0x03)
  header[4] = (frameLength >> 3) & 0xff
  header[5] = ((frameLength & 0x07) << 5) | 0x1f
  header[6] = 0xfc

  return header
}

function copyBytes(bytes: Uint8Array<ArrayBufferLike>) {
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

async function copyAacToAdtsBlob(audioTrack: InputAudioTrack) {
  const sink = new EncodedPacketSink(audioTrack)
  const firstPacket = await sink.getFirstPacket()

  if (!firstPacket) {
    throw new Error('Could not read the first AAC packet.')
  }

  const decoderConfig = await audioTrack.getDecoderConfig()
  const description = decoderConfig?.description
  const config = description
    ? parseAacConfig(copyBufferSource(description))
    : null
  const chunks: BlobPart[] = []
  const offset = firstPacket.timestamp
  let duration = 0

  for await (const packet of sink.packets(firstPacket)) {
    duration = Math.max(duration, packet.timestamp - offset + packet.duration)

    if (config) {
      chunks.push(createAdtsHeader(config, packet.data.byteLength + 7))
    }

    chunks.push(copyBytes(packet.data))
  }

  return {
    blob: new Blob(chunks, { type: 'audio/aac' }),
    duration,
  }
}

async function copyEncodedAudioTrack(
  audioTrack: InputAudioTrack,
  outputChoice: OutputChoice
) {
  if (!audioTrack.codec) {
    throw new Error('Could not identify the audio codec.')
  }

  const sink = new EncodedPacketSink(audioTrack)
  const firstPacket = await sink.getFirstPacket()

  if (!firstPacket) {
    throw new Error('Could not read the first audio packet.')
  }

  const source = new EncodedAudioPacketSource(audioTrack.codec)
  const output = new Output({
    format: outputChoice.format,
    target: new BufferTarget(),
  })
  const decoderConfig = await audioTrack.getDecoderConfig()
  const offset = firstPacket.timestamp
  let duration = 0
  let isFirstPacket = true

  output.addAudioTrack(source)
  await output.start()

  for await (const packet of sink.packets(firstPacket)) {
    const timestamp = packet.timestamp - offset
    const offsetPacket = packet.clone({ timestamp })

    duration = Math.max(duration, timestamp + packet.duration)

    await source.add(
      offsetPacket,
      isFirstPacket && decoderConfig ? { decoderConfig } : undefined
    )
    isFirstPacket = false
  }

  source.close()
  await output.finalize()

  const buffer = output.target.buffer

  if (!buffer) {
    throw new Error('The audio output was empty.')
  }

  return { buffer, duration }
}

export function AudioExtractor() {
  const fileInputId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<ExtractedAudio[]>([])
  const resultsRef = useRef<ExtractedAudio[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [compressAudio, setCompressAudio] = useState(false)
  const [canCompressAudio, setCanCompressAudio] = useState<boolean | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Waiting for a video file')

  const selectedFileMeta = useMemo(() => {
    if (!file) return null

    return `${file.name} · ${formatBytes(file.size)}`
  }, [file])

  useEffect(() => {
    let isMounted = true

    canEncodeAudio('opus', {
      numberOfChannels: 1,
      sampleRate: 48000,
      bitrate: 48000,
    })
      .then((isSupported) => {
        if (isMounted) setCanCompressAudio(isSupported)
      })
      .catch(() => {
        if (isMounted) setCanCompressAudio(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    resultsRef.current = results
  }, [results])

  useEffect(() => {
    return () => {
      for (const result of resultsRef.current) {
        URL.revokeObjectURL(result.url)
      }
    }
  }, [])

  async function extractAudio() {
    if (!file || isExtracting) return

    const mode = compressAudio && canCompressAudio ? 'compress' : 'extract'
    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt)
    }, 100)

    setIsExtracting(true)
    setError(null)
    setElapsedMs(0)
    setProgress(0)
    setStatus('Reading media')

    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    })

    try {
      const audioTrack = await input.getPrimaryAudioTrack()

      if (!audioTrack) {
        throw new Error('No audio track found in this file.')
      }

      let outputChoice =
        mode === 'compress'
          ? {
              format: new WebMOutputFormat(),
              mimeType: 'audio/webm',
              extension: '.webm',
              strategy: 'fallback' as const,
            }
          : getOutputChoice(audioTrack.codec)
      const canFastAac = mode === 'extract' && audioTrack.codec === 'aac'
      const canCopy =
        mode === 'extract' &&
        !canFastAac &&
        canKeepCodec(outputChoice.format, audioTrack.codec)

      setStatus(
        mode === 'compress'
          ? 'Compressing for transcription'
          : canFastAac
            ? 'Writing fast AAC stream'
            : canCopy
              ? 'Copying encoded audio packets'
              : 'Converting audio track'
      )

      let blob: Blob
      let duration: number

      if (canFastAac) {
        setProgress(10)

        try {
          const result = await copyAacToAdtsBlob(audioTrack)

          blob = result.blob
          duration = result.duration
          outputChoice = {
            format: new AdtsOutputFormat(),
            mimeType: 'audio/aac',
            extension: '.aac',
            strategy: 'fast-aac',
          }
        } catch {
          outputChoice = getOutputChoice(audioTrack.codec)
          setStatus('Fast AAC failed; copying to M4A')
          const result = await copyEncodedAudioTrack(audioTrack, outputChoice)

          blob = new Blob([result.buffer], { type: outputChoice.mimeType })
          duration = result.duration
        }
      } else if (canCopy) {
        setProgress(10)
        const result = await copyEncodedAudioTrack(audioTrack, outputChoice)

        blob = new Blob([result.buffer], { type: outputChoice.mimeType })
        duration = result.duration
      } else {
        const output = new Output({
          format: outputChoice.format,
          target: new BufferTarget(),
        })
        const conversion = await Conversion.init({
          input,
          output,
          showWarnings: false,
          video: { discard: true },
          audio: (track) => ({
            discard: track.id !== audioTrack.id,
            ...(mode === 'compress'
              ? {
                  bitrate: 48000,
                  codec: 'opus' as const,
                  forceTranscode: true,
                  numberOfChannels: 1,
                  sampleRate: 48000,
                }
              : {}),
          }),
          tags: {},
        })

        if (!conversion.isValid) {
          const reasons = conversion.discardedTracks
            .filter(({ track }) => track.isAudioTrack())
            .map(({ reason }) => reason)
            .join(', ')

          throw new Error(
            reasons
              ? `Could not extract the audio track: ${reasons}.`
              : 'Could not extract the audio track.'
          )
        }

        conversion.onProgress = (nextProgress) => {
          setProgress(Math.round(nextProgress * 100))
        }

        await conversion.execute()

        const outputBuffer = output.target.buffer

        if (!outputBuffer) {
          throw new Error('The audio output was empty.')
        }

        blob = new Blob([outputBuffer], { type: outputChoice.mimeType })
        duration = Number.NaN
      }

      const url = URL.createObjectURL(blob)
      const finalElapsedMs = performance.now() - startedAt
      const nextResult: ExtractedAudio = {
        codec: audioTrack.codec,
        duration,
        elapsedMs: finalElapsedMs,
        fileName: `${baseName(file.name)}-${
          mode === 'compress' ? 'transcription' : 'audio'
        }${outputChoice.extension}`,
        mimeType: outputChoice.mimeType,
        mode,
        size: blob.size,
        strategy:
          mode === 'compress'
            ? 'fallback'
            : outputChoice.strategy === 'fast-aac'
              ? 'fast-aac'
              : canCopy
                ? 'copy'
                : outputChoice.strategy,
        url,
      }

      setResults((currentResults) => {
        for (const result of currentResults) {
          if (result.mode === nextResult.mode) URL.revokeObjectURL(result.url)
        }

        return [
          ...currentResults.filter((result) => result.mode !== nextResult.mode),
          nextResult,
        ].sort(
          (a, b) =>
            (a.mode === 'extract' ? -1 : 1) - (b.mode === 'extract' ? -1 : 1)
        )
      })
      setElapsedMs(finalElapsedMs)
      setProgress(100)
      setStatus('Audio ready')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Audio extraction failed.'
      )
      setStatus('Extraction failed')
      setProgress(0)
    } finally {
      window.clearInterval(timer)
      input.dispose()
      setIsExtracting(false)
    }
  }

  return (
    <main className='min-h-svh bg-background text-foreground'>
      <div className='mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10'>
        <header className='flex flex-col gap-2 border-b pb-5'>
          <h1 className='font-heading text-3xl font-medium tracking-normal'>
            Audio Extractor
          </h1>
          <p className='max-w-2xl text-sm leading-6 text-muted-foreground'>
            Upload a video, extract its primary audio track, and verify the
            result in-browser.
          </p>
        </header>

        <section className='grid gap-5'>
          <div className='grid min-h-44 place-items-center border border-dashed bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50'>
            <input
              id={fileInputId}
              className='sr-only'
              type='file'
              accept='video/*,.mkv,.webm,.mov,.mp4,.m4v'
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null

                setFile(nextFile)
                setError(null)
                setProgress(0)
                setStatus(
                  nextFile ? 'Ready to extract' : 'Waiting for a video file'
                )
                setElapsedMs(0)
                setResults((currentResults) => {
                  for (const result of currentResults) {
                    URL.revokeObjectURL(result.url)
                  }

                  return []
                })
              }}
            />
            <label
              className='flex cursor-pointer flex-col gap-2'
              htmlFor={fileInputId}
            >
              <span className='text-sm font-medium'>
                {selectedFileMeta ?? 'Choose a video file'}
              </span>
              <span className='text-xs text-muted-foreground'>
                MP4, MOV, WebM, Matroska, and other Mediabunny-supported formats
              </span>
            </label>
          </div>

          <div className='flex flex-wrap items-center gap-3 border bg-muted/20 p-3'>
            {canCompressAudio ? (
              <label className='flex items-center gap-2 text-sm'>
                <input
                  checked={compressAudio}
                  className='size-4 accent-primary'
                  disabled={isExtracting}
                  onChange={(event) => setCompressAudio(event.target.checked)}
                  type='checkbox'
                />
                <span>Compress for transcription</span>
              </label>
            ) : (
              <div className='text-sm text-muted-foreground'>
                {canCompressAudio === null
                  ? 'Checking compression support'
                  : 'Opus compression is not available in this browser'}
              </div>
            )}
            {canCompressAudio && (
              <div className='text-xs text-muted-foreground'>
                Opus · mono · 48 kbps · WebM
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button disabled={!file || isExtracting} onClick={extractAudio}>
              {isExtracting
                ? compressAudio
                  ? 'Compressing'
                  : 'Extracting'
                : compressAudio && canCompressAudio
                  ? 'Compress audio'
                  : 'Extract audio'}
            </Button>
            <div className='text-xs text-muted-foreground'>{status}</div>
            {(isExtracting || elapsedMs > 0) && (
              <div className='font-mono text-xs text-muted-foreground'>
                {formatElapsed(elapsedMs)}
              </div>
            )}
          </div>

          {(isExtracting || progress > 0) && (
            <div className='h-1.5 overflow-hidden bg-muted'>
              <div
                className='h-full bg-primary transition-[width]'
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && (
            <div className='border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
              {error}
            </div>
          )}
        </section>

        {results.length > 0 && (
          <section className='grid gap-4 border-t pt-6'>
            <h2 className='text-sm font-medium'>Results</h2>
            <div className='grid gap-4'>
              {results.map((result) => (
                <div className='grid gap-3 border p-4' key={result.mode}>
                  <div className='grid gap-1 text-sm'>
                    <h3 className='font-medium'>{result.fileName}</h3>
                    <p className='text-xs text-muted-foreground'>
                      {result.mode === 'compress'
                        ? 'compressed for transcription'
                        : result.strategy === 'fast-aac'
                          ? 'fast AAC stream'
                          : result.strategy === 'copy'
                            ? 'no re-encode'
                            : 'fallback conversion'}{' '}
                      · {result.codec ?? 'unknown codec'} ·{' '}
                      {formatDuration(result.duration)} ·{' '}
                      {formatBytes(result.size)} ·{' '}
                      {formatElapsed(result.elapsedMs)}
                      {file
                        ? ` · ${Math.round((1 - result.size / file.size) * 100)}% smaller than source file`
                        : ''}
                    </p>
                  </div>
                  <audio className='w-full' controls src={result.url}>
                    <track kind='captions' />
                  </audio>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
