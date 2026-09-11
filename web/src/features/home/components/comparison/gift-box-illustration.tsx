interface GiftBoxIllustrationProps {
  tagLabel: string
  className?: string
}

export function GiftBoxIllustration(props: GiftBoxIllustrationProps) {
  return (
    <div className={props.className} aria-hidden='true'>
      <svg
        viewBox='0 0 240 220'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='h-full w-full'
      >
        <defs>
          <linearGradient id='gift-scene-bg' x1='20' y1='20' x2='220' y2='220'>
            <stop offset='0%' stopColor='#F3F8FF' />
            <stop offset='100%' stopColor='#E6F0FF' />
          </linearGradient>
          <linearGradient id='gift-box-white' x1='70' y1='70' x2='170' y2='170'>
            <stop offset='0%' stopColor='#FFFFFF' />
            <stop offset='100%' stopColor='#F3F7FD' />
          </linearGradient>
          <linearGradient id='gift-box-side' x1='150' y1='90' x2='210' y2='170'>
            <stop offset='0%' stopColor='#EEF4FC' />
            <stop offset='100%' stopColor='#E0EAF7' />
          </linearGradient>
          <linearGradient id='gift-ribbon-blue' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#5B9BFF' />
            <stop offset='100%' stopColor='#2F7DF6' />
          </linearGradient>
          <linearGradient id='gift-bow-blue' x1='90' y1='40' x2='150' y2='90'>
            <stop offset='0%' stopColor='#6BA8FF' />
            <stop offset='100%' stopColor='#2F7DF6' />
          </linearGradient>
          <filter id='gift-drop-shadow' x='-30%' y='-20%' width='160%' height='160%'>
            <feDropShadow
              dx='0'
              dy='14'
              stdDeviation='14'
              floodColor='#2F7DF6'
              floodOpacity='0.16'
            />
          </filter>
        </defs>

        <rect x='0' y='0' width='240' height='220' rx='24' fill='url(#gift-scene-bg)' />

        <path
          d='M34 58 C48 42 62 48 70 62'
          stroke='#8CB8FF'
          strokeWidth='4'
          strokeLinecap='round'
          opacity='0.55'
        />
        <path
          d='M188 48 C204 34 218 42 222 58'
          stroke='#8CB8FF'
          strokeWidth='4'
          strokeLinecap='round'
          opacity='0.45'
        />
        <path
          d='M28 118 C18 96 34 78 58 72'
          stroke='#A8C8FF'
          strokeWidth='3.5'
          strokeLinecap='round'
          opacity='0.35'
        />
        <ellipse cx='120' cy='188' rx='58' ry='10' fill='#2F7DF6' opacity='0.08' />

        <g transform='translate(118 118) rotate(-8)' filter='url(#gift-drop-shadow)'>
          <path
            d='M52 34 L118 34 L132 92 L38 92 Z'
            fill='url(#gift-box-side)'
            stroke='#D8E6F7'
            strokeWidth='1.2'
          />
          <path
            d='M38 92 L132 92 L142 148 L28 148 Z'
            fill='url(#gift-box-white)'
            stroke='#D8E6F7'
            strokeWidth='1.2'
          />
          <path
            d='M38 92 L85 68 L132 92 L85 116 Z'
            fill='#FFFFFF'
            stroke='#D8E6F7'
            strokeWidth='1.2'
          />
          <path
            d='M82 34 L82 148'
            stroke='url(#gift-ribbon-blue)'
            strokeWidth='14'
            strokeLinecap='round'
          />
          <path
            d='M38 92 L132 92'
            stroke='url(#gift-ribbon-blue)'
            strokeWidth='14'
            strokeLinecap='round'
          />
          <ellipse cx='82' cy='34' rx='24' ry='12' fill='url(#gift-bow-blue)' />
          <path
            d='M58 24 C52 14 58 8 68 8 C74 8 78 12 82 18 C86 12 90 8 96 8 C106 8 112 14 106 24 C102 30 92 34 82 34 C72 34 62 30 58 24 Z'
            fill='url(#gift-bow-blue)'
          />
          <circle cx='68' cy='18' r='7' fill='#8CB8FF' opacity='0.55' />
          <circle cx='96' cy='18' r='7' fill='#8CB8FF' opacity='0.55' />

          <g transform='translate(46 104) rotate(6)'>
            <rect
              x='0'
              y='0'
              width='78'
              height='34'
              rx='10'
              fill='#FFF2DF'
              stroke='#EED9BC'
              strokeWidth='1'
            />
            <circle cx='10' cy='10' r='2' fill='#D8C2A3' />
            <circle cx='68' cy='10' r='2' fill='#D8C2A3' />
            <text
              x='39'
              y='22'
              textAnchor='middle'
              fill='#B87924'
              fontSize='11'
              fontWeight='600'
              fontFamily='system-ui, sans-serif'
            >
              {props.tagLabel}
            </text>
          </g>
        </g>

        <path
          d='M176 72 C188 60 202 64 208 76'
          stroke='#7EB0FF'
          strokeWidth='3.5'
          strokeLinecap='round'
          opacity='0.5'
        />
        <path
          d='M52 146 C40 158 26 154 20 142'
          stroke='#7EB0FF'
          strokeWidth='3.5'
          strokeLinecap='round'
          opacity='0.4'
        />
      </svg>
    </div>
  )
}
