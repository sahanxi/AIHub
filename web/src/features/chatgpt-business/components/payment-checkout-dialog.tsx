import { ArrowRightIcon, ShieldCheckIcon, WalletCardsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface PaymentCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: { display: string; settle: string } | null
  loading: boolean
  onConfirm: () => void
}

export function PaymentCheckoutDialog(props: PaymentCheckoutDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open && !props.loading) props.onOpenChange(false)
      }}
    >
      <AlertDialogContent className='w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-sky-100/70 p-0 shadow-2xl shadow-blue-200/40'>
        <AlertDialogHeader className='px-6 pt-7 text-left sm:place-items-start sm:text-left'>
          <AlertDialogMedia className='mb-4 size-12 rounded-2xl bg-[#1677ff] text-white shadow-lg shadow-blue-300/60'>
            <WalletCardsIcon className='size-6' />
          </AlertDialogMedia>
          <AlertDialogTitle className='text-2xl font-semibold tracking-tight text-slate-950'>
            {t('Alipay Payment')}
          </AlertDialogTitle>
          <AlertDialogDescription className='mt-1 text-sm leading-6 text-slate-600'>
            {t('Review your payment details')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {props.amount ? (
          <div className='mx-6 rounded-2xl border border-white/90 bg-white/85 p-5 shadow-sm'>
            <p className='text-xs font-medium tracking-wide text-slate-500 uppercase'>
              {t('Amount due today')}
            </p>
            <p className='mt-1 text-4xl font-semibold tracking-tight text-slate-950'>
              {props.amount.display}
            </p>
            <div className='mt-5 flex items-center justify-between border-t border-slate-100 pt-4'>
              <div>
                <p className='text-sm font-medium text-slate-800'>
                  {t('You Pay')}
                </p>
                <p className='mt-1 text-xs text-slate-500'>
                  {t('Settled in CNY via Alipay')}
                </p>
              </div>
              <p className='text-xl font-semibold text-slate-950'>
                {props.amount.settle}
              </p>
            </div>
          </div>
        ) : null}

        <div className='mx-6 flex items-center gap-2 text-xs leading-5 text-slate-500'>
          <ShieldCheckIcon className='size-4 shrink-0 text-emerald-600' />
          {t('You will be redirected to Alipay to complete payment securely.')}
        </div>

        <AlertDialogFooter className='mt-2 border-white/80 bg-white/80 p-5 sm:grid sm:grid-cols-2'>
          <AlertDialogCancel className='h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50'>
            {t('Cancel')}
          </AlertDialogCancel>
          <Button
            className='h-11 rounded-xl bg-gradient-to-r from-[#1677ff] to-[#4f9cff] font-semibold text-white shadow-lg shadow-blue-300/60 hover:from-[#096dd9] hover:to-[#3d8df5]'
            onClick={props.onConfirm}
            disabled={props.loading}
          >
            {t('Alipay Payment')}
            <ArrowRightIcon className='size-4' />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
