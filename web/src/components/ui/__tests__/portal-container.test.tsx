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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DateTimePicker } from '@/components/datetime-picker'

import { Combobox } from '../combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '../drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet'

const options = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google' },
]

function ProviderCombobox(props: {
  onValueChange: (value: string | null) => void
}) {
  return (
    <Combobox
      options={options}
      value='openai'
      onValueChange={props.onValueChange}
      aria-label='Provider'
    />
  )
}

function ProviderSelect(props: {
  onValueChange: (value: string | null) => void
}) {
  return (
    <Select value='openai' onValueChange={props.onValueChange}>
      <SelectTrigger aria-label='Provider'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FilterDrawer(props: { children: ReactNode }) {
  return (
    <Drawer open>
      <DrawerContent>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription>Adjust the result filters</DrawerDescription>
        {props.children}
      </DrawerContent>
    </Drawer>
  )
}

function CreateKeySheet(props: { children: ReactNode }) {
  return (
    <Sheet open>
      <SheetContent>
        <SheetTitle>Create API Key</SheetTitle>
        <SheetDescription>Add a new API key</SheetDescription>
        {props.children}
      </SheetContent>
    </Sheet>
  )
}

function FilterDialog(props: { children: ReactNode }) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Filters</DialogTitle>
        <DialogDescription>Adjust the result filters</DialogDescription>
        {props.children}
      </DialogContent>
    </Dialog>
  )
}

const expirationDate = new Date(2026, 9, 9, 17, 50)

// JSDOM does not implement the pointer-capture API used by the drawer.
const pointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'setPointerCapture'
)

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  })
})

afterEach(() => {
  if (pointerCapture) {
    Object.defineProperty(
      HTMLElement.prototype,
      'setPointerCapture',
      pointerCapture
    )
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
  }
})

describe('popups inside a drawer', () => {
  it('renders combobox options inside the drawer dialog and clicking one applies it without closing the drawer', async () => {
    const change = vi.fn()
    render(
      <FilterDrawer>
        <ProviderCombobox onValueChange={change} />
      </FilterDrawer>
    )
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog', { name: 'Filters' })

    await user.click(within(dialog).getByRole('combobox', { name: 'Provider' }))
    await user.click(
      await within(dialog).findByRole('option', { name: 'Google' })
    )

    expect(change).toHaveBeenCalledWith('gemini')
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })

  it('renders select options inside the drawer dialog and clicking one applies it without closing the drawer', async () => {
    const change = vi.fn()
    render(
      <FilterDrawer>
        <ProviderSelect onValueChange={change} />
      </FilterDrawer>
    )
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog', { name: 'Filters' })

    await user.click(within(dialog).getByRole('combobox', { name: 'Provider' }))
    await user.click(
      await within(dialog).findByRole('option', { name: 'Google' })
    )

    expect(change).toHaveBeenCalledWith('gemini', expect.anything())
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })
})

describe('popups outside a drawer', () => {
  it('portals combobox options to document.body outside the component subtree', async () => {
    const view = render(<ProviderCombobox onValueChange={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Provider' }))
    const listbox = await screen.findByRole('listbox')

    expect(document.body).toContainElement(listbox)
    expect(view.container).not.toContainElement(listbox)
  })

  it('portals select options to document.body outside the component subtree', async () => {
    const view = render(<ProviderSelect onValueChange={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('combobox', { name: 'Provider' }))
    const listbox = await screen.findByRole('listbox')

    expect(document.body).toContainElement(listbox)
    expect(view.container).not.toContainElement(listbox)
  })
})

describe('popups inside a sheet', () => {
  it('renders the date calendar inside the sheet and picking a day closes the picker without closing the sheet', async () => {
    const change = vi.fn()
    render(
      <CreateKeySheet>
        <DateTimePicker value={expirationDate} onChange={change} />
      </CreateKeySheet>
    )
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog', { name: 'Create API Key' })

    await user.click(within(dialog).getByRole('button', { name: '2026-10-09' }))
    const calendar = await within(dialog).findByRole('grid')
    expect(dialog).toContainElement(calendar)

    await user.click(
      within(dialog).getByRole('button', { name: /October 15th, 2026/i })
    )

    expect(change).toHaveBeenCalled()
    expect(within(dialog).queryByRole('grid')).not.toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: 'Create API Key' })
    ).toBeInTheDocument()
  })

  it('lets month and year dropdowns change the visible calendar month inside the sheet', async () => {
    render(
      <CreateKeySheet>
        <DateTimePicker value={expirationDate} onChange={vi.fn()} />
      </CreateKeySheet>
    )
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog', { name: 'Create API Key' })

    await user.click(within(dialog).getByRole('button', { name: '2026-10-09' }))
    await within(dialog).findByRole('grid')

    const month = within(dialog).getByRole('combobox', { name: /month/i })
    const year = within(dialog).getByRole('combobox', { name: /year/i })
    await user.selectOptions(month, '11')
    await user.selectOptions(year, '2027')

    expect(month).toHaveValue('11')
    expect(year).toHaveValue('2027')
    expect(
      screen.getByRole('dialog', { name: 'Create API Key' })
    ).toBeInTheDocument()
  })
})

describe('popups inside a dialog', () => {
  it('renders the date calendar inside the dialog and picking a day closes the picker without closing the dialog', async () => {
    const change = vi.fn()
    render(
      <FilterDialog>
        <DateTimePicker value={expirationDate} onChange={change} />
      </FilterDialog>
    )
    const user = userEvent.setup()
    const dialog = screen.getByRole('dialog', { name: 'Filters' })

    await user.click(within(dialog).getByRole('button', { name: '2026-10-09' }))
    const calendar = await within(dialog).findByRole('grid')
    expect(dialog).toContainElement(calendar)

    await user.click(
      within(dialog).getByRole('button', { name: /October 15th, 2026/i })
    )

    expect(change).toHaveBeenCalled()
    expect(within(dialog).queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })
})
