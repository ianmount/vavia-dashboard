import { kv } from '@vercel/kv'

const KEY = 'vavia:tasks'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const tasks = await kv.get(KEY)
      res.status(200).json(tasks ?? [])
    } catch (err) {
      console.error('[api/tasks] KV GET failed:', err?.message)
      res.status(500).json({ error: err?.message ?? 'KV read failed' })
    }

  } else if (req.method === 'POST') {
    try {
      await kv.set(KEY, req.body)
      res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[api/tasks] KV SET failed:', err?.message)
      res.status(500).json({ error: err?.message ?? 'KV write failed' })
    }

  } else {
    res.status(405).end()
  }
}
