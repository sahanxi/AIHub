interface GiftBoxIllustrationProps {
  tagLabel: string
  className?: string
}

export function GiftBoxIllustration(props: GiftBoxIllustrationProps) {
  return (
    <div className={props.className} aria-hidden='true'>
      <svg
        viewBox='0 0 220 200'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='h-full w-full'
      >
        <defs>
          <linearGradient id='gift-body' x1='50' y1='90' x2='170' y2='180'>
            <stop offset='0%' stopColor='#F8FBFF' />
            <stop offset='100%' stopColor='#EAF3FF' />
          </linearGradient>
          <linearGradient id='gift-lid' x1='60' y1='48' x2='160' y2='98'>
            <stop offset='0%' stopColor='#FFFFFF' />
            <stop offset='100%' stopColor='#EEF4FF' />
          </linearGradient>
          <linearGradient id='gift-ribbon-v' x1='108' y1='40' x2='112' y2='180'>
            <stop offset='0%' stopColor='#4B83F6' />
            <stop offset='100%' stopColor='#2F6DE8' />
          </linearGradient>
          <linearGradient id='gift-ribbon-h' x1='40' y1='108' x2='180' y2='112'>
            <stop offset='0%' stopColor='#4B83F6' />
            <stop offset='100%' stopColor='#2F6DE8' />
          </linearGradient>
          <linearGradient id='gift-bow' x1='88' y1='28' x2='132' y2='58'>
            <stop offset='0%' stopColor='#66A3FF' />
            <stop offset='100%' stopColor='#2F7DF6' />
          </linearGradient>
          <filter id='gift-shadow' x='-20%' y='-10%' width='140%' height='140%'>
            <feDropShadow
              dx='0'
              dy='10'
              stdDeviation='12'
              floodColor='#2F7DF6'
              floodOpacity='0.18'
            />
          </filter>
        </defs>

        <path
          d='M34 126 C24 98 42 72 72 66 C88 62 100 72 110 82 C120 72 132 62 148 66 C178 72 196 98 186 126'
          fill='#2F7DF6'
          opacity='0.08'
        />
        <path
          d='M156 34 C170 22 184 28 190 42 C196 56 184 70 168 72'
          stroke='#A8C8FF'
          strokeWidth='2.5'
          strokeLinecap='round'
          opacity='0.55'
        />
        <path
          d='M64 38 C50 26 36 32 30 46 C24 60 36 74 52 76'
          stroke='#A8C8FF'
          strokeWidth='2.5'
          strokeLinecap='round'
          opacity='0.45'
        />

        <g filter='url(#gift-shadow)'>
          <path
            d='M48 96 L172 96 L184 168 L36 168 Z'
            fill='url(#gift-body)'
            stroke='#D9E8FF'
            strokeWidth='1.5'
          />
          <path
            d='M48 96 L110 68 L172 96 L110 124 Z'
            fill='url(#gift-lid)'
            stroke='#D9E8FF'
            strokeWidth='1.5'
          />
          <path
            d='M110 68 L110 168'
            stroke='url(#gift-ribbon-v)'
            strokeWidth='16'
            strokeLinecap='round'
          />
          <path
            d='M48 96 L172 96'
            stroke='url(#gift-ribbon-h)'
            strokeWidth='16'
            strokeLinecap='round'
          />
          <ellipse cx='110' cy='68' rx='22' ry='11' fill='url(#gift-bow)' />
          <path
            d='M88 52 C82 42 88 34 98 34 C104 34 108 38 110 44 C112 38 116 34 122 34 C132 34 138 42 132 52 C128 58 118 62 110 62 C102 62 92 58 88 52 Z'
            fill='url(#gift-bow)'
          />
          <ellipse cx='98' cy='48' rx='8' ry='5' fill='#A8C8FF' opacity='0.65' />
          <ellipse cx='122' cy='48' rx='8' ry='5' fill='#A8C8FF' opacity='0.65' />
        </g>

        <g transform='translate(132 54) rotate(14)'>
          <rect
            x='0'
            y='0'
            width='72'
            height='30'
            rx='15'
            fill='#FFF0DD'
            stroke='#F2DFC5'
            strokeWidth='1'
          />
          <text
            x='36'
            y='19'
            textAnchor='middle'
            fill='#B87924'
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
