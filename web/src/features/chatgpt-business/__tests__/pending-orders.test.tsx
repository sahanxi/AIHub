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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ChatGPTBusinessPage } from '../index'

const apiMocks = vi.hoisted(() => ({
  createBusinessOrder: vi.fn(),
  createBusinessQuote: vi.fn(),
  deleteBusinessPendingOrder: vi.fn(),
  getBusinessCatalog: vi.fn(),
  getBusinessPendingOrders: vi.fn(),
  getBusinessSelf: vi.fn(),
  payBusinessOrderAlipay: vi.fn(),
}))

vi.mock('../api', () => ({
  ...apiMocks,
  isApiSuccess: (response: { success: boolean }) => response.success,
}))

vi.mock('@/features/wallet/lib/payment', () => ({
  startGatewayCheckout: vi.fn(),
}))

test('confirms deletion and removes the pending order after the API succeeds', async () => {
  apiMocks.getBusinessCatalog.mockResolvedValue({
    success: true,
    message: '',
    data: {
      enabled: true,
      product: {
        id: 1,
        code: 'BUSINESS_STANDARD',
        name: 'Business Standard',
        enabled: true,
      },
      price: {
        id: 1,
        product_id: 1,
        price_amount: '204.00',
        currency: 'CNY',
        billing_cadence: 'MONTHLY',
        display_unit: '/ month',
        effective_from: 1,
      },
      workspace: null,
      pricing_required: false,
      currently_available: true,
    },
  })
  apiMocks.getBusinessSelf.mockResolvedValue({
    success: true,
    message: '',
    data: { subscription: null, workspace: null },
  })
  apiMocks.getBusinessPendingOrders.mockResolvedValue({
    success: true,
    message: '',
    data: [
      {
        id: 41,
        order_no: 'BS-41',
        total_amount: '197.08',
        currency: 'CNY',
        status: 'PAYING',
        prepaid_through: 1_789_056_000,
        chatgpt_email: 'buyer@example.com',
        created_at: 1_789_056_000,
      },
    ],
  })
  apiMocks.deleteBusinessPendingOrder.mockResolvedValue({
    success: true,
    message: '',
    data: { success: true },
  })

  const user = userEvent.setup()
  render(<ChatGPTBusinessPage />)

  await user.click(
    await screen.findByRole('button', { name: /Pending orders/ })
  )
  expect(await screen.findByText('¥197.08')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Delete' }))

  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('Delete pending order?')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

  await waitFor(() =>
    expect(apiMocks.deleteBusinessPendingOrder).toHaveBeenCalledWith(41)
  )
  await waitFor(() =>
    expect(screen.queryByText('¥197.08')).not.toBeInTheDocument()
  )
})

test('shows all workspaces and marks the selected workspace subscription', async () => {
  apiMocks.getBusinessCatalog.mockResolvedValue({
    success: true,
    message: '',
    data: {
      enabled: true,
      product: {
        id: 1,
        code: 'BUSINESS_STANDARD',
        name: 'Business Standard',
        enabled: true,
      },
      price: null,
      workspace: null,
      pricing_required: false,
      currently_available: true,
      workspaces: [
        {
          workspace: { id: 1, name: 'Standard', status: 'ACTIVE' },
          price: {
            price_amount: '1.00',
            currency: 'USD',
            billing_cadence: 'MONTHLY',
            display_unit: '/ month',
          },
          pricing_required: false,
          currently_available: true,
        },
        {
          workspace: { id: 2, name: 'Premium', status: 'ACTIVE' },
          price: {
            price_amount: '2.00',
            currency: 'USD',
            billing_cadence: 'MONTHLY',
            display_unit: '/ month',
          },
          pricing_required: false,
          currently_available: true,
        },
      ],
    },
  })
  apiMocks.getBusinessSelf.mockResolvedValue({
    success: true,
    message: '',
    data: {
      subscription: null,
      workspace: null,
      price: null,
      subscriptions: [
        {
          subscription: {
            id: 7,
            user_id: 1,
            workspace_id: 1,
            status: 'ACTIVE',
            chatgpt_email: 'buyer@example.com',
            prepaid_through: 1_789_056_000,
          },
          workspace: { id: 1, name: 'Standard', status: 'ACTIVE' },
          price: {
            price_amount: '1.00',
            currency: 'USD',
            billing_cadence: 'MONTHLY',
            display_unit: '/ month',
          },
        },
      ],
    },
  })
  apiMocks.getBusinessPendingOrders.mockResolvedValue({
    success: true,
    message: '',
    data: [],
  })

  render(<ChatGPTBusinessPage />)

  expect(
    await screen.findByText('Standard', {
      selector: '[data-slot="card-title"]',
    })
  ).toBeInTheDocument()
  expect(
    screen.getByText('Premium', { selector: '[data-slot="card-title"]' })
  ).toBeInTheDocument()
  expect(screen.getByText('Subscribed')).toBeInTheDocument()
  const emailInputs = screen.getAllByLabelText('ChatGPT Login Email')
  expect(emailInputs).toHaveLength(2)
  expect(emailInputs[0]).toHaveValue('buyer@example.com')
  expect(emailInputs[0]).toHaveAttribute('readonly')
  expect(emailInputs[1]).not.toHaveAttribute('readonly')
  expect(
    screen.queryByText('Business Standard', {
      selector: '[data-slot="card-title"]',
    })
  ).not.toBeInTheDocument()
})

test('shows pending orders even when their workspace has a pending subscription', async () => {
  apiMocks.getBusinessCatalog.mockResolvedValue({
    success: true,
    message: '',
    data: {
      enabled: true,
      product: {
        id: 1,
        code: 'BUSINESS_STANDARD',
        name: 'Business',
        enabled: true,
      },
      price: null,
      workspace: null,
      pricing_required: false,
      currently_available: true,
      workspaces: [
        {
          workspace: { id: 1, name: 'Standard', status: 'ACTIVE' },
          price: null,
          pricing_required: false,
          currently_available: true,
        },
      ],
    },
  })
  apiMocks.getBusinessSelf.mockResolvedValue({
    success: true,
    message: '',
    data: {
      subscription: null,
      workspace: null,
      price: null,
      subscriptions: [
        {
          subscription: {
            id: 7,
            user_id: 1,
            workspace_id: 1,
            status: 'PENDING_PAYMENT',
            chatgpt_email: 'buyer@example.com',
            prepaid_through: 1_789_056_000,
          },
          workspace: { id: 1, name: 'Standard', status: 'ACTIVE' },
          price: null,
        },
      ],
    },
  })
  apiMocks.getBusinessPendingOrders.mockResolvedValue({
    success: true,
    message: '',
    data: [
      {
        id: 42,
        order_no: 'BS-42',
        total_amount: '0.62',
        currency: 'USD',
        status: 'CREATED',
        prepaid_through: 1_789_056_000,
      },
    ],
  })

  const user = userEvent.setup()
  render(<ChatGPTBusinessPage />)

  await user.click(
    await screen.findByRole('button', { name: /Pending orders/ })
  )
  expect(await screen.findByText('$0.62')).toBeInTheDocument()
})
