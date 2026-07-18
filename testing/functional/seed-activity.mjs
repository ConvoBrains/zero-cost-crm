/**
 * Regenerate multi-SDR session + activity fixtures for today and prior days (IST).
 */
import pg from 'pg'
import { assertSafeTestingDb } from './assert-safe-db.mjs'

const info = assertSafeTestingDb()
const pool = new pg.Pool({ connectionString: info.connectionString, ssl: false })

const DAYS = 3
const SDR_EMAILS = [
  'rahul.seed@convobrains.com',
  'neha.seed@convobrains.com',
  'aman.seed@convobrains.com',
]

const CALL_OUTCOMES = [
  "Didn't Pick",
  'No Answer',
  'Connected - Not Right Person',
  'Connected - Future Follow-up',
  'Interested',
  'Follow-up Required',
  'Rejected',
  'Called',
]

function istDayBounds(offsetDays) {
  const todayIst = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const startUtc = new Date(`${todayIst}T00:00:00+05:30`)
  startUtc.setTime(startUtc.getTime() - offsetDays * 24 * 60 * 60_000)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60_000)
  return { startUtc, endUtc }
}

function atHour(dayStart, hour, minute = 0) {
  return new Date(dayStart.getTime() + (hour * 60 + minute) * 60_000)
}

/** For "today", schedule relative to now so active-time math isn't all in the future. */
function workBlocks(dayStart, offsetDays) {
  if (offsetDays === 0) {
    const now = new Date()
    const logoutAt = new Date(Math.max(dayStart.getTime() + 60 * 60_000, now.getTime() - 20 * 60_000))
    const loginAt = new Date(Math.max(dayStart.getTime() + 30 * 60_000, logoutAt.getTime() - 7 * 60 * 60_000))
    const idleStart = new Date(loginAt.getTime() + 3.5 * 60 * 60_000)
    const resumeAt = new Date(idleStart.getTime() + 50 * 60_000)
    return { loginAt, idleStart, resumeAt, logoutAt }
  }
  return {
    loginAt: atHour(dayStart, 9, 30),
    idleStart: atHour(dayStart, 13, 0),
    resumeAt: atHour(dayStart, 13, 50),
    logoutAt: atHour(dayStart, 18, 10),
  }
}

async function logEvent(client, { userId, sessionId, type, entityType, entityId, summary, payload, at }) {
  await client.query(
    `
    INSERT INTO activity_events (
      user_id, session_id, event_type, entity_type, entity_id, summary, payload, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    [
      userId,
      sessionId,
      type,
      entityType,
      entityId ?? null,
      summary,
      JSON.stringify({ seed: true, ...payload }),
      at.toISOString(),
    ],
  )
}

try {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`DELETE FROM activity_events WHERE payload->>'seed' = 'true'`)
    await client.query(`DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))`, [
      SDR_EMAILS,
    ])
    await client.query(
      `DELETE FROM conversations WHERE called_by IN (SELECT id FROM users WHERE email = ANY($1::text[]))`,
      [SDR_EMAILS],
    )

    const { rows: users } = await client.query(
      `SELECT id, email, name FROM users WHERE email = ANY($1::text[])`,
      [SDR_EMAILS],
    )
    if (users.length < 3) throw new Error('Run make test-seed first')

    for (const user of users) {
      const { rows: contacts } = await client.query(
        `
        SELECT ct.id, ct.contact_name, ct.company_id, co.company_name, co.stage
        FROM contacts ct
        JOIN companies co ON co.id = ct.company_id
        WHERE co.assigned_to = $1
        ORDER BY ct.created_at
        `,
        [user.id],
      )
      if (!contacts.length) continue

      const intensity =
        user.email.startsWith('rahul') ? 1.0 : user.email.startsWith('neha') ? 0.9 : 0.7

      for (let d = 0; d < DAYS; d++) {
        const { startUtc } = istDayBounds(d)
        const { loginAt, idleStart, resumeAt, logoutAt } = workBlocks(startUtc, d)

        const { rows: sess1 } = await client.query(
          `
          INSERT INTO user_sessions (user_id, started_at, last_active_at, ended_at, end_reason)
          VALUES ($1, $2, $3, $4, 'idle')
          RETURNING id
          `,
          [user.id, loginAt.toISOString(), idleStart.toISOString(), idleStart.toISOString()],
        )
        const sid1 = sess1[0].id
        await logEvent(client, {
          userId: user.id,
          sessionId: sid1,
          type: 'session.login',
          entityType: 'session',
          entityId: sid1,
          summary: 'Login',
          payload: {},
          at: loginAt,
        })
        await logEvent(client, {
          userId: user.id,
          sessionId: sid1,
          type: 'session.idle',
          entityType: 'session',
          entityId: sid1,
          summary: 'Idle',
          payload: { reason: 'idle' },
          at: idleStart,
        })

        const { rows: sess2 } = await client.query(
          `
          INSERT INTO user_sessions (user_id, started_at, last_active_at, ended_at, end_reason)
          VALUES ($1, $2, $3, $4, 'manual')
          RETURNING id
          `,
          [user.id, resumeAt.toISOString(), logoutAt.toISOString(), logoutAt.toISOString()],
        )
        const sid2 = sess2[0].id
        await logEvent(client, {
          userId: user.id,
          sessionId: sid2,
          type: 'session.login',
          entityType: 'session',
          entityId: sid2,
          summary: 'Login',
          payload: {},
          at: resumeAt,
        })
        await logEvent(client, {
          userId: user.id,
          sessionId: sid2,
          type: 'session.active_again',
          entityType: 'session',
          entityId: sid2,
          summary: 'Active again',
          payload: {},
          at: resumeAt,
        })
        await logEvent(client, {
          userId: user.id,
          sessionId: sid2,
          type: 'session.logout',
          entityType: 'session',
          entityId: sid2,
          summary: 'Logout',
          payload: { reason: 'manual' },
          at: logoutAt,
        })

        const callCount = Math.round((user.email.startsWith('aman') ? 18 : 28) * intensity) - d * 2
        for (let i = 0; i < callCount; i++) {
          const contact = contacts[i % contacts.length]
          const outcome = CALL_OUTCOMES[i % CALL_OUTCOMES.length]
          const morning = i < callCount / 2
          const base = morning ? loginAt : resumeAt
          const at = new Date(base.getTime() + (i + 1) * 4 * 60_000)
          const sid = morning ? sid1 : sid2

          await logEvent(client, {
            userId: user.id,
            sessionId: sid,
            type: 'contact.opened',
            entityType: 'contact',
            entityId: contact.id,
            summary: `Opened ${contact.contact_name}`,
            payload: { name: contact.contact_name },
            at,
          })
          await logEvent(client, {
            userId: user.id,
            sessionId: sid,
            type: 'contact.status_changed',
            entityType: 'contact',
            entityId: contact.id,
            summary: `Changed status → ${outcome}`,
            payload: { from: 'Not Contacted', to: outcome, name: contact.contact_name },
            at: new Date(at.getTime() + 60_000),
          })
          await client.query(
            `UPDATE contacts SET contact_status = $1, last_contacted = $2::date, updated_at = $3 WHERE id = $4`,
            [outcome, at.toISOString().slice(0, 10), at.toISOString(), contact.id],
          )

          if (outcome === 'Interested' || outcome === 'Connected - Future Follow-up' || outcome === 'Follow-up Required') {
            const fu = new Date(at.getTime() + 2 * 60_000)
            const fuDate = new Date(fu.getTime() + 24 * 60 * 60_000).toISOString().slice(0, 10)
            await client.query(`UPDATE contacts SET next_follow_up = $1 WHERE id = $2`, [fuDate, contact.id])
            await logEvent(client, {
              userId: user.id,
              sessionId: sid,
              type: 'contact.follow_up_set',
              entityType: 'contact',
              entityId: contact.id,
              summary: `Follow-up added for ${contact.contact_name}`,
              payload: { nextFollowUp: fuDate, name: contact.contact_name },
              at: fu,
            })
          }

          if (i % 7 === 0) {
            const noteAt = new Date(at.getTime() + 90_000)
            await logEvent(client, {
              userId: user.id,
              sessionId: sid,
              type: 'contact.note_added',
              entityType: 'contact',
              entityId: contact.id,
              summary: `Added note on ${contact.contact_name}`,
              payload: { name: contact.contact_name },
              at: noteAt,
            })
          }

          if (i % 9 === 0) {
            const upAt = new Date(at.getTime() + 120_000)
            const { rows: conv } = await client.query(
              `
              INSERT INTO conversations (
                company_id, contact_id, called_by, stage_at_call, called_at,
                s3_url, file_ext, upload_status, notes
              ) VALUES ($1, $2, $3, $4, $5, $6, 'mp3', 'completed', 'seed recording')
              RETURNING id
              `,
              [
                contact.company_id,
                contact.id,
                user.id,
                contact.stage || 'Lead Added',
                upAt.toISOString(),
                `seed://${user.id}/${contact.id}/${upAt.getTime()}.mp3`,
              ],
            )
            await logEvent(client, {
              userId: user.id,
              sessionId: sid,
              type: 'conversation.uploaded',
              entityType: 'conversation',
              entityId: conv[0].id,
              summary: `Uploaded recording for ${contact.contact_name}`,
              payload: { contactId: contact.id, name: contact.contact_name },
              at: upAt,
            })
          }
        }

        // A few company stage moves
        for (const [ci, contact] of contacts.slice(0, 2).entries()) {
          const stageAt = new Date(logoutAt.getTime() - (30 - ci * 5) * 60_000)
          const nextStage = ci === 0 ? 'Demo Scheduled' : contact.stage
          if (ci === 0) {
            await client.query(`UPDATE companies SET stage = $1, updated_at = $2 WHERE id = $3`, [
              nextStage,
              stageAt.toISOString(),
              contact.company_id,
            ])
            await logEvent(client, {
              userId: user.id,
              sessionId: sid2,
              type: 'company.stage_changed',
              entityType: 'company',
              entityId: contact.company_id,
              summary: `Stage → ${nextStage} (${contact.company_name})`,
              payload: { from: 'Lead Added', to: nextStage, name: contact.company_name },
              at: stageAt,
            })
          }
          await logEvent(client, {
            userId: user.id,
            sessionId: sid2,
            type: 'company.opened',
            entityType: 'company',
            entityId: contact.company_id,
            summary: `Opened ${contact.company_name}`,
            payload: { name: contact.company_name },
            at: new Date(stageAt.getTime() - 60_000),
          })
        }
      }
    }

    await client.query('COMMIT')
    console.log(`testing/functional/seed-activity: ${DAYS} days × ${users.length} SDRs`)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
} finally {
  await pool.end()
}
