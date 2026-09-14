import { DEFAULT_LOGO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

interface AihubMarkProps {
  className?: string
}

export function AihubMark(props: AihubMarkProps) {
  const logo = useSystemConfigStore((state) => state.logo) || DEFAULT_LOGO

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5',
        props.className
      )}
      aria-hidden='true'
      style={{
        boxShadow: '0 8px 20px rgba(47, 125, 246, 0.18)',
      }}
    >
      <img
        src={logo}
        alt=''
        className='size-full object-contain'
        loading='lazy'
      />
    </span>
  )
}
