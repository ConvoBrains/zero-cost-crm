import type { Express } from 'express'
import type { Pool } from 'pg'
import { requireAuth, requireAdmin } from './auth.js'
import { mapConversation } from './mappers.js'
import {
  contentTypeForExt,
  copyToFinal,
  deleteObject,
  finalKey,
  headObject,
  keyFromUrl,
  MAX_RECORDING_BYTES,
  normalizeExt,
  objectUrl,
  presignGet,
  presignPut,
  stagingKey,
} from './s3.js'
import { STAGES } from '../src/types.js'
import { logActivity } from './activity.js'

const CONVERSATION_SELECT = `
  SELECT
    cv.*,
    u.name AS called_by_name,
    ct.contact_name,
    co.company_name
  FROM conversations cv
  JOIN users u ON u.id = cv.called_by
  JOIN contacts ct ON ct.id = cv.contact_id
  JOIN companies co ON co.id = cv.company_id
`

function isStage(s: string): boolean {
  return (STAGES as readonly string[]).includes(s)
}

export function registerConversationRoutes(app: Express, pool: Pool) {
  app.post('/api/conversations/presign', requireAuth, async (req, res) => {
    const contactId = String(req.body.contactId ?? '')
    const fileExt = normalizeExt(String(req.body.fileExt ?? ''))
    const notes = req.body.notes != null ? String(req.body.notes) : null

    if (!contactId || !fileExt) {
      res.status(400).json({ error: 'contactId and valid fileExt are required' })
      return
    }

    const { rows: contacts } = await pool.query(
      `SELECT ct.*, co.stage AS company_stage
       FROM contacts ct
       JOIN companies co ON co.id = ct.company_id
       WHERE ct.id = $1`,
      [contactId],
    )
    const contact = contacts[0]
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' })
      return
    }

    let stageAtCall = String(req.body.stageAtCall ?? contact.company_stage ?? 'Lead Added')
    if (!isStage(stageAtCall)) stageAtCall = 'Lead Added'

    const { rows } = await pool.query(
      `
      INSERT INTO conversations (
        company_id, contact_id, called_by, stage_at_call, file_ext, notes, upload_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
      `,
      [contact.company_id, contactId, req.user!.sub, stageAtCall, fileExt, notes],
    )
    const row = rows[0]
    const staging = stagingKey(String(row.id), fileExt)
    const uploadUrl = await presignPut(staging, contentTypeForExt(fileExt))

    res.status(201).json({
      conversationId: row.id,
      uploadUrl,
      stagingKey: staging,
    })
  })

  app.post('/api/conversations/:id/complete', requireAuth, async (req, res) => {
    const { id } = req.params
    const { rows } = await pool.query('SELECT * FROM conversations WHERE id = $1', [id])
    const row = rows[0]
    if (!row) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }
    if (row.upload_status === 'completed') {
      const { rows: full } = await pool.query(`${CONVERSATION_SELECT} WHERE cv.id = $1`, [id])
      res.json(mapConversation(full[0]))
      return
    }
    if (row.called_by !== req.user!.sub && req.user!.role !== 'admin' && req.user!.role !== 'founder') {
      res.status(403).json({ error: 'Not allowed to complete this upload' })
      return
    }

    const staging = stagingKey(String(row.id), row.file_ext)
    let head
    try {
      head = await headObject(staging)
    } catch {
      res.status(400).json({ error: 'Recording not found in storage — upload may have failed' })
      return
    }
    const size = head.ContentLength ?? 0
    if (size > MAX_RECORDING_BYTES) {
      await deleteObject(staging).catch(() => {})
      await pool.query('DELETE FROM conversations WHERE id = $1', [id])
      res.status(400).json({ error: 'Recording exceeds 50 MB limit' })
      return
    }

    const calledAt = new Date()
    const final = finalKey(String(row.id), row.file_ext, calledAt)
    await copyToFinal(staging, final)
    await deleteObject(staging)
    const s3Url = objectUrl(final)

    try {
      const { rows: updated } = await pool.query(
        `
        UPDATE conversations
        SET called_at = $1, s3_url = $2, upload_status = 'completed', updated_at = now()
        WHERE id = $3
        RETURNING id
        `,
        [calledAt.toISOString(), s3Url, id],
      )
      if (!updated[0]) throw new Error('update failed')
    } catch (e: unknown) {
      await deleteObject(final).catch(() => {})
      const err = e as { code?: string }
      if (err.code === '23505') {
        res.status(409).json({ error: 'Duplicate call at this exact time — please upload again' })
        return
      }
      throw e
    }

    const { rows: full } = await pool.query(`${CONVERSATION_SELECT} WHERE cv.id = $1`, [id])
    const mapped = mapConversation(full[0])
    await logActivity({
      userId: req.user!.sub,
      sessionId: req.user!.sid,
      eventType: 'conversation.uploaded',
      entityType: 'conversation',
      entityId: String(id),
      summary: `Uploaded recording for ${mapped.contactName}`,
      payload: {
        contactId: mapped.contactId,
        companyId: mapped.companyId,
        name: mapped.contactName,
      },
    })
    res.json(mapped)
  })

  app.get('/api/conversations', requireAuth, async (req, res) => {
    const contactId = req.query.contactId ? String(req.query.contactId) : null
    const companyId = req.query.companyId ? String(req.query.companyId) : null
    const conditions = ["cv.upload_status = 'completed'"]
    const values: string[] = []
    if (contactId) {
      values.push(contactId)
      conditions.push(`cv.contact_id = $${values.length}`)
    }
    if (companyId) {
      values.push(companyId)
      conditions.push(`cv.company_id = $${values.length}`)
    }
    const { rows } = await pool.query(
      `${CONVERSATION_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY cv.called_at DESC`,
      values,
    )
    res.json(rows.map(mapConversation))
  })

  app.get('/api/conversations/:id/play', requireAuth, async (req, res) => {
    const { id } = req.params
    const { rows } = await pool.query(
      `SELECT s3_url FROM conversations WHERE id = $1 AND upload_status = 'completed'`,
      [id],
    )
    if (!rows[0]?.s3_url) {
      res.status(404).json({ error: 'Recording not found' })
      return
    }
    const key = keyFromUrl(rows[0].s3_url)
    const playUrl = await presignGet(key)
    res.json({ playUrl })
  })

  app.delete('/api/conversations/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params
    const { rows } = await pool.query(
      `
      SELECT cv.s3_url, cv.file_ext, cv.upload_status, t.contact_name
      FROM conversations cv
      LEFT JOIN contacts t ON t.id = cv.contact_id
      WHERE cv.id = $1
      `,
      [id],
    )
    const row = rows[0]
    if (!row) {
      res.status(404).json({ error: 'Conversation not found' })
      return
    }
    const contactName = row.contact_name ? String(row.contact_name) : 'contact'
    if (row.upload_status === 'completed' && row.s3_url) {
      try {
        await deleteObject(keyFromUrl(row.s3_url))
      } catch {
        /* object may already be gone */
      }
    } else if (row.upload_status === 'pending') {
      const staging = stagingKey(String(id), row.file_ext)
      await deleteObject(staging).catch(() => {})
    }
    await pool.query('DELETE FROM conversations WHERE id = $1', [id])
    await logActivity({
      userId: req.user!.sub,
      sessionId: req.user!.sid,
      eventType: 'conversation.deleted',
      entityType: 'conversation',
      entityId: String(id),
      summary: `Deleted recording for ${contactName}`,
      payload: { name: contactName },
    })
    res.status(204).end()
  })
}
