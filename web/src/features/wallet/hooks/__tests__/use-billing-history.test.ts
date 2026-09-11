import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useBillingHistory } from '../use-billing-history'

const apiMocks = vi.hoisted(() => ({
  deletePendingTopUp: vi.fn(),
  getUserBillingHistory: vi.fn(),
}))

vi.mock('../../api', () => ({
  deletePendingTopUp: apiMocks.deletePendingTopUp,
  getUserBillingHistory: apiMocks.getUserBillingHistory,
  isApiSuccess: (response: { success: boolean }) => response.success,
}))

vi.mock('@/hooks/use-admin', () => ({
  useIsAdmin: () => false,
}))

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}))

test('deletes a pending order and refreshes billing history', async () => {
  apiMocks.getUserBillingHistory.mockResolvedValue({
    success: true,
    data: { items: [{ id: 12, status: 'pending' }], total: 1 },
  })
  apiMocks.deletePendingTopUp.mockResolvedValue({ success: true })

  const { result } = renderHook(() => useBillingHistory())

  await waitFor(() => expect(result.current.records).toHaveLength(1))
  await act(async () => {
    await result.current.handleDeleteOrder(12)
  })

  expect(apiMocks.deletePendingTopUp).toHaveBeenCalledWith(12)
  expect(apiMocks.getUserBillingHistory).toHaveBeenCalledTimes(2)
})
