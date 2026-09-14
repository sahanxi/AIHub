import { DEFAULT_LOGO } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

interface AihubMarkProps {
  className?: string
}

export function AihubMark(props: AihubMarkProps) {
  const logo =
    useSystemConfigStore((state) => state.config.logo) || DEFAULT_LOGO

  return (
    <span
      className={cn(
        'inline-flex aspect-square shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1',
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
        className='h-full w-full object-contain object-center'
        loading='lazy'
      />
    </span>
  )
}
