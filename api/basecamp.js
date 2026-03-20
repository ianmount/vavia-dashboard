// Basecamp 3 API proxy — keeps BASECAMP_TOKEN server-side
// Required env vars: BASECAMP_TOKEN, BASECAMP_ACCOUNT_ID, BASECAMP_PROJECT_ID
// Token: https://launchpad.37signals.com/authorization/new (personal access token)

const USER_AGENT = 'VaVia Internal Dashboard (contact@vavia.com)'

async function bcFetch(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Basecamp ${res.status} ${url}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function fetchAllPages(baseUrl, token) {
  let results = []
  let url = baseUrl
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
    })
    if (!res.ok) break
    const page = await res.json()
    results = results.concat(page)
    // Basecamp uses Link header for pagination
    const link = res.headers.get('Link') ?? ''
    const next = link.match(/<([^>]+)>;\s*rel="next"/)
    url = next ? next[1] : null
  }
  return results
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { BASECAMP_TOKEN, BASECAMP_ACCOUNT_ID, BASECAMP_PROJECT_ID } = process.env

  if (!BASECAMP_TOKEN || !BASECAMP_ACCOUNT_ID || !BASECAMP_PROJECT_ID) {
    return res.status(200).json({ configured: false, todos: [] })
  }

  const BASE = `https://3.basecampapi.com/${BASECAMP_ACCOUNT_ID}`

  try {
    // Get project to find the todoset dock item
    const project = await bcFetch(`${BASE}/projects/${BASECAMP_PROJECT_ID}.json`, BASECAMP_TOKEN)
    const todoset = project.dock?.find(d => d.name === 'todoset')
    if (!todoset) {
      return res.status(200).json({ configured: true, todos: [], reason: 'No todoset found in project' })
    }

    // Get all todo lists
    const todolists = await fetchAllPages(
      `${BASE}/buckets/${BASECAMP_PROJECT_ID}/todosets/${todoset.id}/todolists.json`,
      BASECAMP_TOKEN
    )

    // Fetch todos from each list in parallel
    const allTodos = await Promise.all(
      todolists.map(list =>
        fetchAllPages(
          `${BASE}/buckets/${BASECAMP_PROJECT_ID}/todolists/${list.id}/todos.json`,
          BASECAMP_TOKEN
        )
          .then(todos => todos.map(t => ({ ...t, _listName: list.title, _listId: list.id })))
          .catch(() => [])
      )
    )

    const todos = allTodos.flat().map(t => ({
      id: String(t.id),
      title: t.content,
      completed: t.completed,
      due_on: t.due_on ?? null,
      listName: t._listName,
      listId: String(t._listId),
      url: t.app_url,
      assignee: t.assignees?.[0]?.name ?? null,
      description: t.description ? t.description.replace(/<[^>]*>/g, '').trim() : '',
    }))

    res.status(200).json({ configured: true, todos })
  } catch (err) {
    console.error('[api/basecamp]', err.message)
    res.status(500).json({ error: err.message })
  }
}
