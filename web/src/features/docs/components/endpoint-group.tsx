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
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import type { DocsApiGroup, DocsAuthLevel, DocsEndpointStatus } from '../types'

const METHOD_STYLES: Record<string, string> = {
  GET: 'border-success/30 bg-success/10 text-success',
  POST: 'border-primary/30 bg-primary/10 text-primary',
  PUT: 'border-warning/30 bg-warning/10 text-warning',
  PATCH: 'border-warning/30 bg-warning/10 text-warning',
  DELETE: 'border-destructive/30 bg-destructive/10 text-destructive',
  HEAD: 'border-border bg-muted text-muted-foreground',
}

function AuthBadge(props: { level: DocsAuthLevel }) {
  const { t } = useTranslation()
  const labels: Record<DocsAuthLevel, string> = {
    public: t('Public'),
    'public-or-user': `${t('Public')} / ${t('User')}`,
    'api-key': t('API key'),
    user: t('User'),
    admin: t('Admin'),
    root: t('Root'),
    artifact: t('API key or signed artifact URL'),
  }

  return <Badge variant='outline'>{labels[props.level]}</Badge>
}

function StatusBadge(props: { status: DocsEndpointStatus | undefined }) {
  const { t } = useTranslation()
  if (!props.status || props.status === 'available') return null

  if (props.status === 'unimplemented') {
    return <Badge variant='destructive'>{t('Not implemented')}</Badge>
  }

  return <Badge variant='warning'>{t('Configuration required')}</Badge>
}

export function EndpointGroup(props: { group: DocsApiGroup }) {
  const { t } = useTranslation()

  return (
    <section
      id={props.group.id}
      className='scroll-mt-24 [contain-intrinsic-size:auto_600px] [content-visibility:auto]'
    >
      <Card className='gap-0 py-0'>
        <CardHeader className='border-b py-4'>
          <div className='flex items-start gap-3'>
            <div className='bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg'>
              <HugeiconsIcon icon={props.group.icon} strokeWidth={1.8} />
            </div>
            <div className='min-w-0'>
              <CardTitle>{t(props.group.titleKey)}</CardTitle>
              <CardDescription className='mt-1 leading-relaxed'>
                {t(props.group.descriptionKey)}
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <AuthBadge level={props.group.defaultAuth} />
          </CardAction>
        </CardHeader>
        {props.group.requestFields ? (
          <CardContent className='border-b py-3'>
            <p className='text-muted-foreground mb-2 text-xs font-medium'>
              {t('Common request fields')}
            </p>
            <div className='flex flex-wrap gap-1.5'>
              {props.group.requestFields.map((field) => (
                <code
                  key={field}
                  className='bg-muted rounded-md px-2 py-1 font-mono text-xs'
                >
                  {field}
                </code>
              ))}
            </div>
          </CardContent>
        ) : null}
        <CardContent className='px-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-24 pl-4'>{t('Method')}</TableHead>
                <TableHead>{t('Route')}</TableHead>
                <TableHead className='w-44'>{t('Authentication')}</TableHead>
                <TableHead className='w-48 pr-4'>{t('Availability')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.group.endpoints.map((endpoint) => (
                <TableRow key={`${endpoint.method}-${endpoint.path}`}>
                  <TableCell className='pl-4'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'font-mono',
                        METHOD_STYLES[endpoint.method]
                      )}
                    >
                      {endpoint.method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className='font-mono text-xs'>{endpoint.path}</code>
                  </TableCell>
                  <TableCell>
                    <AuthBadge
                      level={endpoint.auth ?? props.group.defaultAuth}
                    />
                  </TableCell>
                  <TableCell className='pr-4'>
                    <StatusBadge status={endpoint.status} />
                    {!endpoint.status || endpoint.status === 'available' ? (
                      <span className='text-muted-foreground text-xs'>
                        {t('Available')}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
