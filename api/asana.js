// Asana API proxy — keeps ASANA_TOKEN server-side
// Required env vars: ASANA_TOKEN, ASANA_PROJECT_GID (or ASANA_WORKSPACE_GID)

const ASANA_BASE = 'https://app.asana.com/api/1.0'
const FIELDS = 'gid,name,completed,due_on,notes,permalink_url,assignee.name,memberships.project.name'

async function asanaFetch(path) {
  const res = await fetch(`${ASANA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.ASANA_TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Asana ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  return json.data
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.ASANA_TOKEN) {
    return res.status(200).json({ configured: false, tasks: [] })
  }

  try {
    let tasks

    if (process.env.ASANA_PROJECT_GID) {
      // Fetch tasks from a specific project
      tasks = await asanaFetch(
        `/projects/${process.env.ASANA_PROJECT_GID}/tasks?opt_fields=${FIELDS}&completed_since=now&limit=100`
      )
      // Also fetch completed tasks (up to 100)
      const completed = await asanaFetch(
        `/projects/${process.env.ASANA_PROJECT_GID}/tasks?opt_fields=${FIELDS}&limit=100`
      )
      // Merge, dedup by gid
      const seen = new Set(tasks.map(t => t.gid))
      completed.forEach(t => { if (!seen.has(t.gid)) tasks.push(t) })
    } else if (process.env.ASANA_WORKSPACE_GID) {
      tasks = await asanaFetch(
        `/workspaces/${process.env.ASANA_WORKSPACE_GID}/tasks?opt_fields=${FIELDS}&assignee=me&limit=100`
      )
    } else {
      return res.status(200).json({ configured: false, tasks: [], reason: 'No ASANA_PROJECT_GID or ASANA_WORKSPACE_GID set' })
    }

    const shaped = (tasks ?? []).map(t => ({
      gid: t.gid,
      name: t.name,
      completed: t.completed,
      due_on: t.due_on ?? null,
      notes: t.notes ?? '',
      url: t.permalink_url,
      assignee: t.assignee?.name ?? null,
      project: t.memberships?.[0]?.project?.name ?? null,
    }))

    res.status(200).json({ configured: true, tasks: shaped })
  } catch (err) {
    console.error('[api/asana]', err.message)
    res.status(500).json({ error: err.message })
  }
}
