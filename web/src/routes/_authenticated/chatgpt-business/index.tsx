import { createFileRoute } from '@tanstack/react-router'

import { ChatGPTBusinessPage } from '@/features/chatgpt-business'

export const Route = createFileRoute('/_authenticated/chatgpt-business/')({
  component: ChatGPTBusinessPage,
})
