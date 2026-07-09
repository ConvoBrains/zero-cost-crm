import { api } from './api'
import type { Conversation, Stage } from '../types'

export async function listConversations(params: {
  contactId?: string
  companyId?: string
}): Promise<Conversation[]> {
  const q = new URLSearchParams()
  if (params.contactId) q.set('contactId', params.contactId)
  if (params.companyId) q.set('companyId', params.companyId)
  return api<Conversation[]>(`/api/conversations?${q}`)
}

export async function presignConversation(body: {
  contactId: string
  stageAtCall: Stage
  fileExt: string
  notes?: string
}): Promise<{ conversationId: string; uploadUrl: string }> {
  return api('/api/conversations/presign', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function completeConversation(id: string): Promise<Conversation> {
  return api(`/api/conversations/${id}/complete`, { method: 'POST' })
}

export async function getPlayUrl(id: string): Promise<string> {
  const { playUrl } = await api<{ playUrl: string }>(`/api/conversations/${id}/play`)
  return playUrl
}

export async function deleteConversation(id: string): Promise<void> {
  await api(`/api/conversations/${id}`, { method: 'DELETE' })
}

export async function uploadConversationRecording(
  contactId: string,
  stageAtCall: Stage,
  file: File,
  notes?: string,
): Promise<Conversation> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const { conversationId, uploadUrl } = await presignConversation({
    contactId,
    stageAtCall,
    fileExt: ext,
    notes,
  })
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  if (!put.ok) {
    throw new Error('Upload to storage failed')
  }
  return completeConversation(conversationId)
}
