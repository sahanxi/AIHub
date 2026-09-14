/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { useHomeCatalog } from '../hooks/use-home-catalog'
import type { HomeVendorMark } from '../lib/home-vendor-display'

type BrandMarkProps = {
  icon: string
  name: string
  size?: number
  className?: string
  nameClassName?: string
}

export function BrandMark(props: BrandMarkProps) {
  const size = props.size ?? 16

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 align-middle whitespace-nowrap',
        props.className
      )}
    >
      <span className='inline-flex shrink-0 items-center justify-center'>
        {getLobeIcon(props.icon, size)}
      </span>
      <span className={props.nameClassName}>{props.name}</span>
    </span>
  )
}

type LeadingModelMarksProps = {
  size?: number
  vendors?: HomeVendorMark[]
  limit?: number
}

export function LeadingModelMarks(props: LeadingModelMarksProps) {
  const { i18n } = useTranslation()
  const { vendorMarks } = useHomeCatalog()
  const size = props.size ?? 16
  const limit = props.limit ?? 4
  const vendors = (props.vendors ?? vendorMarks).slice(0, limit)
  const separator = i18n.language.startsWith('zh') ? '、' : ', '

  return (
    <>
      {vendors.map((vendor, index) => (
        <Fragment key={vendor.name}>
          {index > 0 ? <span>{separator}</span> : null}
          <BrandMark icon={vendor.icon} name={vendor.name} size={size} />
        </Fragment>
      ))}
    </>
  )
}
