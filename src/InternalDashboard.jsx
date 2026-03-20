import { useState, useEffect, useRef } from 'react'
import './InternalDashboard.css'

// ── Name-similarity scorer ─────────────────────────────────────
function similarityScore(a, b) {
  const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  const wa = clean(a)
  const wb = clean(b)
  if (wa.length === 0 || wb.length === 0) return 0
  const overlap = wa.filter(w => wb.includes(w)).length
  return overlap / Math.max(wa.length, wb.length)
}

const AUTO_LINK_THRESHOLD = 0.6   // auto-apply
const SUGGEST_THRESHOLD   = 0.3   // show as suggestion

// ── Helpers ───────────────────────────────────────────────────
let _id = 1000
const nextId = () => ++_id

async function postTasks(tasks) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks),
  })
  return res.ok
}

// ── Sub-components ────────────────────────────────────────────

function TabBar({ active, onChange, tabs }) {
  return (
    <div className="id-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`id-tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && (
            <span className="id-tab-count">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function SourceBadge({ type, name, url, onUnlink }) {
  if (!name) return null
  return (
    <span className={`id-link-badge id-link-${type}`}>
      <a href={url} target="_blank" rel="noreferrer">{name}</a>
      <button className="id-link-unlink" onClick={onUnlink} title="Unlink">×</button>
    </span>
  )
}

function LinkSelect({ tasks, currentId, onChange }) {
  return (
    <select
      className="id-link-select"
      value={currentId ?? ''}
      onChange={e => onChange(e.target.value || null)}
    >
      <option value="">— unlinked —</option>
      {tasks.map(t => (
        <option key={t.id} value={t.id}>{t.task || '(unnamed)'}</option>
      ))}
    </select>
  )
}

function SuggestionBanner({ suggestions, onAccept, onDismiss }) {
  if (suggestions.length === 0) return null
  return (
    <div className="id-suggestion-banner">
      <div className="id-suggestion-header">
        <strong>{suggestions.length} suggested link{suggestions.length !== 1 ? 's' : ''}</strong>
        <span>— review auto-matched tasks below</span>
        <button className="id-suggestion-accept-all" onClick={() => onAccept(suggestions)}>
          Accept all
        </button>
        <button className="id-suggestion-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <div className="id-suggestion-list">
        {suggestions.map((s, i) => (
          <div key={i} className="id-suggestion-row">
            <span className="id-suggestion-main">{s.taskName}</span>
            <span className="id-suggestion-arrow">→</span>
            <span className={`id-suggestion-ext id-link-${s.type}`}>
              {s.type === 'asana' ? 'Asana' : 'Basecamp'}
            </span>
            <span className="id-suggestion-ext-name">{s.extName}</span>
            <span className="id-suggestion-score">{Math.round(s.score * 100)}% match</span>
            <button className="id-suggestion-accept-one" onClick={() => onAccept([s])}>Accept</button>
            <button className="id-suggestion-reject-one" onClick={() => onDismiss(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────
function TasksTab({ tasks, asanaTasks, basecampTasks, onUpdate, onAdd, onDelete }) {
  function getAsanaTask(gid) {
    return asanaTasks.find(t => t.gid === gid)
  }
  function getBasecampTodo(id) {
    return basecampTasks.find(t => t.id === id)
  }

  return (
    <div className="id-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Task</th>
            <th>Est</th>
            <th>Actual</th>
            <th>Timeline</th>
            <th>Asana</th>
            <th>Basecamp</th>
            <th>Internal Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && (
            <tr><td colSpan={9} className="id-empty">No tasks yet.</td></tr>
          )}
          {tasks.map(row => {
            const asana = getAsanaTask(row.asanaTaskGid)
            const bc = getBasecampTodo(row.basecampTodoId)
            const isOver = row.actualHours && row.hourEstimate &&
              Number(row.actualHours) > Number(row.hourEstimate)

            return (
              <tr key={row.id}>
                <td>
                  <select
                    className={`id-status-select id-status-${(row.status || '').toLowerCase().replace(' ', '-')}`}
                    value={row.status}
                    onChange={e => onUpdate(row.id, 'status', e.target.value)}
                  >
                    {['Approved', 'On Hold', 'Completed', 'Pending'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="id-inline"
                    defaultValue={row.task}
                    key={`task-${row.id}`}
                    placeholder="Task name…"
                    onBlur={e => onUpdate(row.id, 'task', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="id-inline id-narrow"
                    type="number" min="0"
                    defaultValue={row.hourEstimate}
                    key={`est-${row.id}`}
                    placeholder="—"
                    onBlur={e => onUpdate(row.id, 'hourEstimate', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className={`id-inline id-narrow${isOver ? ' id-over' : ''}`}
                    type="number" min="0"
                    defaultValue={row.actualHours}
                    key={`act-${row.id}`}
                    placeholder="—"
                    onBlur={e => onUpdate(row.id, 'actualHours', e.target.value)}
                  />
                  {isOver && <span className="id-over-label">+{Number(row.actualHours) - Number(row.hourEstimate)}</span>}
                </td>
                <td>
                  <input
                    className="id-inline"
                    defaultValue={row.timeline}
                    key={`tl-${row.id}`}
                    placeholder="e.g. 2 weeks"
                    onBlur={e => onUpdate(row.id, 'timeline', e.target.value)}
                  />
                </td>

                {/* Asana link */}
                <td className="id-link-cell">
                  {asana ? (
                    <SourceBadge
                      type="asana"
                      name={asana.name}
                      url={asana.url}
                      onUnlink={() => onUpdate(row.id, 'asanaTaskGid', null)}
                    />
                  ) : (
                    <select
                      className="id-link-select"
                      value=""
                      onChange={e => e.target.value && onUpdate(row.id, 'asanaTaskGid', e.target.value)}
                    >
                      <option value="">Link Asana…</option>
                      {asanaTasks.map(t => (
                        <option key={t.gid} value={t.gid}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </td>

                {/* Basecamp link */}
                <td className="id-link-cell">
                  {bc ? (
                    <SourceBadge
                      type="basecamp"
                      name={bc.title}
                      url={bc.url}
                      onUnlink={() => onUpdate(row.id, 'basecampTodoId', null)}
                    />
                  ) : (
                    <select
                      className="id-link-select"
                      value=""
                      onChange={e => e.target.value && onUpdate(row.id, 'basecampTodoId', e.target.value)}
                    >
                      <option value="">Link Basecamp…</option>
                      {basecampTasks.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.listName})</option>
                      ))}
                    </select>
                  )}
                </td>

                {/* Internal notes */}
                <td>
                  <input
                    className="id-inline"
                    defaultValue={row.internalNotes}
                    key={`int-${row.id}`}
                    placeholder="Internal only…"
                    onBlur={e => onUpdate(row.id, 'internalNotes', e.target.value)}
                  />
                </td>

                <td>
                  <button className="id-delete-btn" onClick={() => onDelete(row.id)}>×</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="id-table-footer">
        <button className="id-add-btn" onClick={onAdd}>+ Add Task</button>
        {tasks.length > 0 && (
          <span className="id-totals">
            Est: <strong>{tasks.reduce((s, t) => s + (Number(t.hourEstimate) || 0), 0)} hrs</strong>
            &nbsp;·&nbsp;
            Actual: <strong>{tasks.reduce((s, t) => s + (Number(t.actualHours) || 0), 0)} hrs</strong>
          </span>
        )}
      </div>
    </div>
  )
}

// ── Asana Tab ─────────────────────────────────────────────────
function AsanaTab({ asanaTasks, tasks, loading, error, onLink }) {
  const [filter, setFilter] = useState('all')

  if (error) return <div className="id-api-error">Asana error: {error}</div>
  if (!loading && asanaTasks.length === 0) {
    return (
      <div className="id-not-configured">
        <div className="id-nc-icon">⚙</div>
        <div className="id-nc-title">Asana not configured</div>
        <div className="id-nc-body">
          Set <code>ASANA_TOKEN</code> and <code>ASANA_PROJECT_GID</code> (or <code>ASANA_WORKSPACE_GID</code>) in your Vercel environment variables.
        </div>
      </div>
    )
  }

  const linkedGids = new Set(tasks.map(t => t.asanaTaskGid).filter(Boolean))

  const visible = asanaTasks.filter(t => {
    if (filter === 'linked') return linkedGids.has(t.gid)
    if (filter === 'unlinked') return !linkedGids.has(t.gid)
    return true
  })

  return (
    <div>
      <div className="id-source-toolbar">
        <div className="id-source-filters">
          {['all', 'linked', 'unlinked'].map(f => (
            <button key={f} className={`id-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="id-source-count">{visible.length} tasks</span>
      </div>

      <div className="id-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Due</th>
              <th>Status</th>
              <th>Linked to</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="id-empty">Loading Asana tasks…</td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={6} className="id-empty">No tasks match this filter.</td></tr>
            )}
            {visible.map(t => {
              const linkedTask = tasks.find(mt => mt.asanaTaskGid === t.gid)
              return (
                <tr key={t.gid} className={t.completed ? 'id-row-completed' : ''}>
                  <td>
                    <a href={t.url} target="_blank" rel="noreferrer" className="id-ext-link">{t.name}</a>
                    {t.notes && <div className="id-ext-sub">{t.notes.slice(0, 80)}{t.notes.length > 80 ? '…' : ''}</div>}
                  </td>
                  <td className="id-gray">{t.project ?? '—'}</td>
                  <td className="id-gray">{t.due_on ?? '—'}</td>
                  <td>
                    <span className={`id-ext-status ${t.completed ? 'done' : 'open'}`}>
                      {t.completed ? 'Complete' : 'Open'}
                    </span>
                  </td>
                  <td>
                    {linkedTask
                      ? <span className="id-linked-to">{linkedTask.task || '(unnamed)'}</span>
                      : <span className="id-gray">—</span>
                    }
                  </td>
                  <td>
                    <LinkSelect
                      tasks={tasks}
                      currentId={linkedTask?.id ?? null}
                      onChange={mainTaskId => onLink(mainTaskId, 'asanaTaskGid', t.gid)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Basecamp Tab ──────────────────────────────────────────────
function BasecampTab({ basecampTasks, tasks, loading, error, onLink }) {
  const [filter, setFilter] = useState('all')

  if (error) return <div className="id-api-error">Basecamp error: {error}</div>
  if (!loading && basecampTasks.length === 0) {
    return (
      <div className="id-not-configured">
        <div className="id-nc-icon">⚙</div>
        <div className="id-nc-title">Basecamp not configured</div>
        <div className="id-nc-body">
          Set <code>BASECAMP_TOKEN</code>, <code>BASECAMP_ACCOUNT_ID</code>, and <code>BASECAMP_PROJECT_ID</code> in your Vercel environment variables.
        </div>
      </div>
    )
  }

  const linkedIds = new Set(tasks.map(t => t.basecampTodoId).filter(Boolean))

  const visible = basecampTasks.filter(t => {
    if (filter === 'linked') return linkedIds.has(t.id)
    if (filter === 'unlinked') return !linkedIds.has(t.id)
    return true
  })

  return (
    <div>
      <div className="id-source-toolbar">
        <div className="id-source-filters">
          {['all', 'linked', 'unlinked'].map(f => (
            <button key={f} className={`id-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="id-source-count">{visible.length} todos</span>
      </div>

      <div className="id-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Todo</th>
              <th>List</th>
              <th>Due</th>
              <th>Status</th>
              <th>Linked to</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="id-empty">Loading Basecamp todos…</td></tr>
            )}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={6} className="id-empty">No todos match this filter.</td></tr>
            )}
            {visible.map(t => {
              const linkedTask = tasks.find(mt => mt.basecampTodoId === t.id)
              return (
                <tr key={t.id} className={t.completed ? 'id-row-completed' : ''}>
                  <td>
                    <a href={t.url} target="_blank" rel="noreferrer" className="id-ext-link">{t.title}</a>
                    {t.description && <div className="id-ext-sub">{t.description.slice(0, 80)}{t.description.length > 80 ? '…' : ''}</div>}
                  </td>
                  <td className="id-gray">{t.listName}</td>
                  <td className="id-gray">{t.due_on ?? '—'}</td>
                  <td>
                    <span className={`id-ext-status ${t.completed ? 'done' : 'open'}`}>
                      {t.completed ? 'Complete' : 'Open'}
                    </span>
                  </td>
                  <td>
                    {linkedTask
                      ? <span className="id-linked-to">{linkedTask.task || '(unnamed)'}</span>
                      : <span className="id-gray">—</span>
                    }
                  </td>
                  <td>
                    <LinkSelect
                      tasks={tasks}
                      currentId={linkedTask?.id ?? null}
                      onChange={mainTaskId => onLink(mainTaskId, 'basecampTodoId', t.id)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main InternalDashboard ─────────────────────────────────────
export default function InternalDashboard() {
  const [tasks, setTasks] = useState([])
  const [asanaTasks, setAsanaTasks] = useState([])
  const [basecampTasks, setBasecampTasks] = useState([])
  const [activeTab, setActiveTab] = useState('tasks')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState({ tasks: true, asana: true, basecamp: true })
  const [errors, setErrors] = useState({ tasks: null, asana: null, basecamp: null })
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  // ── Load all sources on mount ──────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/asana').then(r => r.json()).catch(() => ({ configured: false, tasks: [] })),
      fetch('/api/basecamp').then(r => r.json()).catch(() => ({ configured: false, todos: [] })),
    ]).then(([tasksData, asanaData, bcData]) => {
      // Tasks
      if (Array.isArray(tasksData)) {
        setTasks(tasksData)
      } else {
        setErrors(e => ({ ...e, tasks: tasksData.error ?? 'Failed to load tasks' }))
      }
      setLoading(l => ({ ...l, tasks: false }))

      // Asana
      if (asanaData.error) {
        setErrors(e => ({ ...e, asana: asanaData.error }))
      } else {
        setAsanaTasks(asanaData.tasks ?? [])
      }
      setLoading(l => ({ ...l, asana: false }))

      // Basecamp
      if (bcData.error) {
        setErrors(e => ({ ...e, basecamp: bcData.error }))
      } else {
        setBasecampTasks(bcData.todos ?? [])
      }
      setLoading(l => ({ ...l, basecamp: false }))

      // Run auto-match after all data loaded
      const t = Array.isArray(tasksData) ? tasksData : []
      const a = asanaData.tasks ?? []
      const b = bcData.todos ?? []
      runAutoMatch(t, a, b)
    })
  }, [])

  // ── Auto-match ─────────────────────────────────────────────
  function runAutoMatch(taskList, asanaList, bcList) {
    const autoApply = []
    const suggest = []

    taskList.forEach(task => {
      // Asana matching
      if (!task.asanaTaskGid && asanaList.length > 0) {
        const best = asanaList
          .map(a => ({ task: a, score: similarityScore(task.task, a.name) }))
          .sort((x, y) => y.score - x.score)[0]

        if (best && best.score >= AUTO_LINK_THRESHOLD) {
          autoApply.push({ taskId: task.id, field: 'asanaTaskGid', value: best.task.gid,
            taskName: task.task, extName: best.task.name, score: best.score, type: 'asana' })
        } else if (best && best.score >= SUGGEST_THRESHOLD) {
          suggest.push({ taskId: task.id, field: 'asanaTaskGid', value: best.task.gid,
            taskName: task.task, extName: best.task.name, score: best.score, type: 'asana' })
        }
      }

      // Basecamp matching
      if (!task.basecampTodoId && bcList.length > 0) {
        const best = bcList
          .map(b => ({ todo: b, score: similarityScore(task.task, b.title) }))
          .sort((x, y) => y.score - x.score)[0]

        if (best && best.score >= AUTO_LINK_THRESHOLD) {
          autoApply.push({ taskId: task.id, field: 'basecampTodoId', value: best.todo.id,
            taskName: task.task, extName: best.todo.title, score: best.score, type: 'basecamp' })
        } else if (best && best.score >= SUGGEST_THRESHOLD) {
          suggest.push({ taskId: task.id, field: 'basecampTodoId', value: best.todo.id,
            taskName: task.task, extName: best.todo.title, score: best.score, type: 'basecamp' })
        }
      }
    })

    // Auto-apply high-confidence matches immediately
    if (autoApply.length > 0) {
      setTasks(prev => {
        let updated = prev
        autoApply.forEach(m => {
          updated = updated.map(t => t.id === m.taskId ? { ...t, [m.field]: m.value } : t)
        })
        persist(updated)
        return updated
      })
    }

    setSuggestions(suggest)
  }

  // ── Persist to Supabase ────────────────────────────────────
  async function persist(updated) {
    setSyncStatus('saving')
    const ok = await postTasks(updated)
    setSyncStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSyncStatus('idle'), 2000)
  }

  // ── Task operations ────────────────────────────────────────
  function updateField(id, field, value) {
    const parsed = (field === 'hourEstimate' || field === 'actualHours')
      ? (value === '' ? '' : Number(value))
      : value
    const updated = tasksRef.current.map(t => t.id === id ? { ...t, [field]: parsed } : t)
    setTasks(updated)
    persist(updated)
  }

  function deleteTask(id) {
    const updated = tasksRef.current.filter(t => t.id !== id)
    setTasks(updated)
    persist(updated)
  }

  function addTask() {
    const newTask = {
      id: nextId(),
      status: 'Approved',
      task: '',
      hourEstimate: '',
      timeline: '',
      notes: '',
      actualHours: '',
      internalNotes: '',
      asanaTaskGid: null,
      basecampTodoId: null,
    }
    const updated = [...tasksRef.current, newTask]
    setTasks(updated)
    persist(updated)
  }

  // Link from Asana or Basecamp tab: assign an external ID to a main task
  function linkExternal(mainTaskId, field, externalId) {
    // If mainTaskId is null, find which task currently has this external ID and clear it
    if (!mainTaskId) {
      const updated = tasksRef.current.map(t =>
        t[field] === externalId ? { ...t, [field]: null } : t
      )
      setTasks(updated)
      persist(updated)
      return
    }
    // Assign to new task (and clear from any other task that had it)
    const updated = tasksRef.current.map(t => {
      if (t[field] === externalId) return { ...t, [field]: null } // clear old link
      if (String(t.id) === String(mainTaskId)) return { ...t, [field]: externalId }
      return t
    })
    setTasks(updated)
    persist(updated)
  }

  // Accept suggestions
  function acceptSuggestions(toAccept) {
    setTasks(prev => {
      let updated = prev
      toAccept.forEach(s => {
        updated = updated.map(t => t.id === s.taskId ? { ...t, [s.field]: s.value } : t)
      })
      persist(updated)
      return updated
    })
    const acceptedIds = new Set(toAccept.map(s => `${s.taskId}-${s.field}`))
    setSuggestions(s => s.filter(x => !acceptedIds.has(`${x.taskId}-${x.field}`)))
  }

  function dismissSuggestion(index) {
    if (typeof index === 'number') {
      setSuggestions(s => s.filter((_, i) => i !== index))
    } else {
      setSuggestions([])
    }
  }

  // Linked counts for tab badges
  const linkedAsana = tasks.filter(t => t.asanaTaskGid).length
  const linkedBasecamp = tasks.filter(t => t.basecampTodoId).length

  const tabs = [
    { id: 'tasks', label: 'Tasks', count: tasks.length },
    { id: 'asana', label: 'Asana', count: asanaTasks.length || null },
    { id: 'basecamp', label: 'Basecamp', count: basecampTasks.length || null },
  ]

  const syncLabel =
    syncStatus === 'saving' ? '● Saving…' :
    syncStatus === 'saved'  ? '✓ Saved' :
    syncStatus === 'error'  ? '⚠ Save failed' :
    errors.tasks            ? `⚠ ${errors.tasks}` :
    loading.tasks           ? '○ Loading…' : '● Live'

  return (
    <div className="id-dashboard">
      <header className="id-header">
        <div className="id-header-logo">
          <div className="id-header-logo-mark">V</div>
          <span className="id-header-logo-text">VaVia</span>
        </div>
        <div className="id-header-center">
          <span className="id-header-badge">Internal Dashboard</span>
          {(loading.asana || loading.basecamp) && (
            <span className="id-loading-dot">Syncing sources…</span>
          )}
          {!loading.asana && !loading.basecamp && (
            <span className="id-sync-summary">
              {linkedAsana}/{tasks.length} Asana linked
              &nbsp;·&nbsp;
              {linkedBasecamp}/{tasks.length} Basecamp linked
            </span>
          )}
        </div>
        <span className={`id-sync-status ${syncStatus === 'saved' ? 'saved' : ''}`}>
          {syncLabel}
        </span>
      </header>

      <main className="id-main">
        <div className="id-page-header">
          <div>
            <h1 className="id-page-title">Internal Dashboard</h1>
            <p className="id-page-subtitle">
              Consolidate tasks across Supabase, Asana, and Basecamp.
            </p>
          </div>
          <a href="/" className="id-client-link">↗ View client dashboard</a>
        </div>

        <SuggestionBanner
          suggestions={suggestions}
          onAccept={acceptSuggestions}
          onDismiss={dismissSuggestion}
        />

        <TabBar active={activeTab} onChange={setActiveTab} tabs={tabs} />

        <div className="id-tab-content">
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              asanaTasks={asanaTasks}
              basecampTasks={basecampTasks}
              onUpdate={updateField}
              onAdd={addTask}
              onDelete={deleteTask}
            />
          )}
          {activeTab === 'asana' && (
            <AsanaTab
              asanaTasks={asanaTasks}
              tasks={tasks}
              loading={loading.asana}
              error={errors.asana}
              onLink={linkExternal}
            />
          )}
          {activeTab === 'basecamp' && (
            <BasecampTab
              basecampTasks={basecampTasks}
              tasks={tasks}
              loading={loading.basecamp}
              error={errors.basecamp}
              onLink={linkExternal}
            />
          )}
        </div>
      </main>

      <footer className="id-footer">
        <span>© {new Date().getFullYear()} VaVia — Internal</span>
        <span className={`id-sync-status ${syncStatus === 'saved' ? 'saved' : ''}`}>{syncLabel}</span>
      </footer>
    </div>
  )
}
