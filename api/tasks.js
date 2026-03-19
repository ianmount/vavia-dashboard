import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('id')
      if (error) throw error
      const tasks = (data ?? []).map(r => ({
        id: r.id,
        status: r.status,
        task: r.task,
        hourEstimate: r.hour_estimate,
        actualHours: r.actual_hours,
        timeline: r.timeline,
        notes: r.notes,
      }))
      res.status(200).json(tasks)
    } catch (err) {
      console.error('[api/tasks] Supabase GET failed:', err?.message)
      res.status(500).json({ error: err?.message ?? 'read failed' })
    }

  } else if (req.method === 'POST') {
    try {
      const tasks = req.body
      // Replace all rows atomically: delete then insert
      const { error: delError } = await supabase.from('tasks').delete().neq('id', -1)
      if (delError) throw delError
      if (tasks.length > 0) {
        const { error: insError } = await supabase.from('tasks').insert(
          tasks.map(t => ({
            id: t.id,
            status: t.status,
            task: t.task,
            hour_estimate: t.hourEstimate,
            actual_hours: t.actualHours,
            timeline: t.timeline,
            notes: t.notes,
          }))
        )
        if (insError) throw insError
      }
      res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[api/tasks] Supabase POST failed:', err?.message)
      res.status(500).json({ error: err?.message ?? 'write failed' })
    }

  } else {
    res.status(405).end()
  }
}
