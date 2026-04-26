import { useSourceStore } from '~/hooks/useStore'

function formatProgress(progress: number) {
  return `${Math.round(progress)}%`
}

export default function Source({ id }: { id: string }) {
  const source = useSourceStore((state) => state.sources[id])
  const audioStatus = source.audioStatus

  return (
    <li className='mb-4'>
      <p>Source: {source.name}</p>
      <p>ID: {source.id}</p>
      <p>Audio stage: {audioStatus.stage}</p>
      {'progress' in audioStatus && <p>Progress: {formatProgress(audioStatus.progress)}</p>}
      {'error' in audioStatus && <p>Error: {audioStatus.error}</p>}
      <p>Video stage: {source.videoStatus.stage}</p>
    </li>
  )
}
