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
import {
  ArrowDown01Icon,
  Menu01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

import { DOCS_DIRECTORIES } from '../docs-data'

function DirectoryNavigation(props: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const directories = DOCS_DIRECTORIES.map((directory) => ({
    ...directory,
    items: directory.items.filter((item) => {
      if (!normalizedQuery) return true
      return (
        t(item.titleKey).toLocaleLowerCase().includes(normalizedQuery) ||
        item.id.toLocaleLowerCase().includes(normalizedQuery)
      )
    }),
  })).filter((directory) => directory.items.length > 0)

  return (
    <div className='flex h-full min-h-0 flex-col gap-4'>
      <div className='relative'>
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2'
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Search API documentation')}
          aria-label={t('Search API documentation')}
          className='pl-9'
        />
      </div>
      <ScrollArea className='min-h-0 flex-1'>
        <nav aria-label={t('Documentation directory')} className='pr-3'>
          <div className='flex flex-col gap-6'>
            {directories.map((directory) => (
              <Collapsible key={directory.id} defaultOpen>
                <CollapsibleTrigger className='group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left'>
                  <span className='text-foreground text-xs font-semibold tracking-wide'>
                    {t(directory.titleKey)}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                    className='text-muted-foreground size-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180'
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className='flex flex-col gap-1'>
                  {directory.items.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={props.onNavigate}
                      className='text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2 py-1.5 text-sm transition-colors'
                    >
                      {t(item.titleKey)}
                    </a>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </nav>
      </ScrollArea>
    </div>
  )
}

export function DocsDesktopSidebar() {
  return (
    <aside className='border-border/60 sticky top-16 hidden h-[calc(100svh-4rem)] w-72 shrink-0 border-r px-5 py-6 lg:block'>
      <DirectoryNavigation />
    </aside>
  )
}

export function DocsMobileNavigation() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className='bg-background/90 border-border/60 sticky top-16 z-20 border-b px-4 py-2 backdrop-blur lg:hidden'>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant='outline' size='sm' className='w-full' />}
        >
          <HugeiconsIcon icon={Menu01Icon} data-icon='inline-start' />
          {t('Browse documentation')}
        </SheetTrigger>
        <SheetContent side='left' className='w-[min(22rem,90vw)]'>
          <SheetHeader className='border-b'>
            <SheetTitle>{t('API Reference')}</SheetTitle>
            <SheetDescription>
              {t('Browse AI model and management API routes.')}
            </SheetDescription>
          </SheetHeader>
          <div className='min-h-0 flex-1 p-4'>
            <div className='h-full'>
              <DirectoryNavigation onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
