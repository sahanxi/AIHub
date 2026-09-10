import { createFileRoute, redirect } from '@tanstack/react-router'

import { ChatGPTBusinessAdminPage } from '@/features/chatgpt-business/admin'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/chatgpt-business/admin/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({ to: '/403' })
    }
  },
  component: ChatGPTBusinessAdminPage,
})
