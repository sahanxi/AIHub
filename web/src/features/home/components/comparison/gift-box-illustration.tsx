interface GiftBoxIllustrationProps {
  tagLabel: string
  className?: string
}

export function GiftBoxIllustration(props: GiftBoxIllustrationProps) {
  return (
    <div
      className={props.className}
      aria-hidden='true'
    >
      <svg
        viewBox='0 0 200 180'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='h-full w-full'
      >
        <defs>
          <linearGradient id='gift-box-top' x1='40' y1='20' x2='160' y2='90'>
            <stop offset='0%' stopColor='#ffffff' />
            <stop offset='100%' stopColor='#eef4ff' />
          </linearGradient>
          <linearGradient id='gift-box-front' x1='30' y1='70' x2='170' y2='170'>
            <stop offset='0%' stopColor='#f8fbff' />
            <stop offset='100%' stopColor='#e3edff' />
          </linearGradient>
          <linearGradient id='gift-ribbon' x1='90' y1='0' x2='110' y2='180'>
            <stop offset='0%' stopColor='#4d8dff' />
            <stop offset='100%' stopColor='#2563eb' />
          </linearGradient>
          <filter id='gift-soft-shadow' x='-20%' y='-20%' width='140%' height='140%'>
            <feDropShadow dx='0' dy='8' stdDeviation='10' floodColor='#2563eb' floodOpacity='0.12' />
          </filter>
        </defs>

        <path
          d='M28 118 C18 92 34 68 62 62 C78 58 92 68 100 78 C108 68 122 58 138 62 C166 68 182 92 172 118 Z'
          fill='url(#gift-ribbon)'
          opacity='0.18'
        />
        <path
          d='M148 36 C162 24 176 30 182 44 C188 58 176 72 160 74 C150 75 142 68 138 58'
          stroke='#60a5fa'
          strokeWidth='3'
          strokeLinecap='round'
          opacity='0.45'
        />
        <path
          d='M52 42 C38 30 24 36 18 50 C12 64 24 78 40 80 C50 81 58 74 62 64'
          stroke='#93c5fd'
          strokeWidth='3'
          strokeLinecap='round'
          opacity='0.35'
        />

        <g filter='url(#gift-soft-shadow)'>
          <path
            d='M42 78 L158 78 L172 156 L28 156 Z'
            fill='url(#gift-box-front)'
            stroke='#dbeafe'
            strokeWidth='1.5'
          />
          <path
            d='M42 78 L100 52 L158 78 L100 104 Z'
            fill='url(#gift-box-top)'
            stroke='#dbeafe'
            strokeWidth='1.5'
          />
          <path
            d='M100 52 L100 156'
            stroke='url(#gift-ribbon)'
            strokeWidth='14'
            strokeLinecap='round'
          />
          <path
            d='M42 78 L158 78'
            stroke='url(#gift-ribbon)'
            strokeWidth='14'
            strokeLinecap='round'
          />
          <ellipse cx='100' cy='52' rx='18' ry='10' fill='#3b82f6' />
          <ellipse cx='100' cy='52' rx='10' ry='6' fill='#60a5fa' />
        </g>

        <g transform='translate(118 28) rotate(12)'>
          <rect
            x='0'
            y='0'
            width='62'
            height='28'
            rx='14'
            fill='#ffffff'
            stroke='#bfdbfe'
            strokeWidth='1'
          />
          <text
            x='31'
            y='18'
            textAnchor='middle'
            fill='#2563eb'
            fontSize='10'
            fontWeight='600'
            fontFamily='system-ui, sans-serif'
          >
            {props.tagLabel}
          </text>
        </g>
      </svg>
    </div>
  )
}
