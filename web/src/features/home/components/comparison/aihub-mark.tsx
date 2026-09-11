interface AihubMarkProps {
  className?: string
}

export function AihubMark(props: AihubMarkProps) {
  return (
    <span
      className={props.className}
      aria-hidden='true'
      style={{
        background: 'linear-gradient(135deg, #2F7DF6 0%, #5B9BFF 100%)',
        boxShadow: '0 8px 20px rgba(47, 125, 246, 0.22)',
      }}
    >
      <svg viewBox='0 0 24 24' fill='none' className='size-[58%]'>
        <path
          d='M7 17L12 7L17 17H7Z'
          fill='white'
          fillOpacity='0.95'
        />
      </svg>
    </span>
  )
}
