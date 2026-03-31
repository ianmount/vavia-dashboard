import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const KEY = 'vavia:tasks'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await redis.get(KEY)
      const tasks = Array.isArray(data) ? data : []
      res.status(200).json(tasks)
    } catch (err) {
      console.error('[api/tasks] Upstash GET failed:', err?.message)
      res.status(500).json({ error: err?.message ?? 'read failed' })
    }

  } else if (req.method === 'POST') {
    try {
      const tasks = req.body
      await redis.set(KEY, tasks)
      res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[api/tasks] Upstash POST failed:', err?.message)
      res.status(500).json({ error: err?.message ?? 'write failed' })
    }

  } else {
    res.status(405).end()
  }
}
