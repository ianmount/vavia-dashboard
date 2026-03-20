import { useState, useEffect, useRef } from 'react'
import './App.css'

// ── Status config ─────────────────────────────────────────────
const STATUSES = [
  { value: 'Approved',  label: 'Approved',  cls: 'badge-approved' },
  { value: 'On Hold',   label: 'On Hold',   cls: 'badge-on-hold' },
  { value: 'Completed', label: 'Completed', cls: 'badge-completed' },
]

const statusClass = (status) =>
  STATUSES.find(s => s.value === status)?.cls ?? 'badge-pending'

// ── Sample data ────────────────────────────────────────────────
const SAMPLE_TASKS = [
  {
    id: 1,
    status: 'Approved',
    task: 'Homepage redesign',
    hourEstimate: 12,
    timeline: '2 weeks',
    notes: 'Includes hero section, nav, and footer updates.',
    actualHours: 10,
  },
  {
    id: 2,
    status: 'Approved',
    task: 'Partner dashboard build-out',
    hourEstimate: 20,
    timeline: '3 weeks',
    notes: 'Current task — hour tracking + project approval view.',
    actualHours: 8,
  },
  {
    id: 3,
    status: 'On Hold',
    task: 'Email campaign template',
    hourEstimate: 6,
    timeline: '1 week',
    notes: 'Awaiting brand asset delivery from partner.',
    actualHours: 0,
  },
  {
    id: 4,
    status: 'Completed',
    task: 'SEO audit & recommendations',
    hourEstimate: 8,
    timeline: '1 week',
    notes: 'Report delivered and reviewed.',
    actualHours: 9,
  },
  {
    id: 5,
    status: 'On Hold',
    task: 'Blog content migration',
    hourEstimate: 5,
    timeline: 'TBD',
    notes: 'On hold pending CMS decision.',
    actualHours: 0,
  },
]

// ── Unique ID helper ───────────────────────────────────────────
let _id = 100
const nextId = () => ++_id

const RETAINER_HOURS = 15
const OVERAGE_RATE = 150

// ── localStorage helpers ───────────────────────────────────────
const LS_KEY = 'vavia_tasks'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveToStorage(tasks) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tasks))
  } catch {}
}

// ── RetainerUsage ──────────────────────────────────────────────
function RetainerUsage({ tasks }) {
  const used = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0)
  const remaining = RETAINER_HOURS - used
  const overHours = Math.round(Math.max(used - RETAINER_HOURS, 0) * 100) / 100
  const additionalCost = Math.round(overHours * OVERAGE_RATE * 100) / 100
  const pct = Math.min((used / RETAINER_HOURS) * 100, 100)

  const barCls =
    pct >= 100 ? 'bar-over' :
    pct >= 80  ? 'bar-low'  : 'bar-good'

  const remainingCls =
    remaining < 0 ? 'remaining critical' :
    pct >= 80     ? 'remaining low'      : 'remaining good'

  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="retainer-card">
      <div className="retainer-header">
        <div>
          <div className="section-label">Retainer</div>
          <div className="retainer-title">Current Retainer Hour Usage</div>
          <div className="retainer-period">{month}</div>
        </div>
      </div>

      <div className="retainer-stats">
        <div className="stat-item">
          <span className="stat-value">{RETAINER_HOURS}</span>
          <span className="stat-label">Total Retainer Hours</span>
          <span className="stat-sub">per month</span>
        </div>
        <div className="stat-item">
          <span className="stat-value used">{used}</span>
          <span className="stat-label">Hours Used</span>
          <span className="stat-sub">{pct.toFixed(0)}% of retainer</span>
        </div>
        <div className="stat-item">
          <span className={`stat-value ${remainingCls}`}>
            {remaining < 0 ? `+${(Math.round(Math.abs(remaining) * 100) / 100).toFixed(2)} over` : remaining}
          </span>
          <span className="stat-label">
            {remaining < 0 ? 'Hours Over Retainer' : 'Hours Remaining'}
          </span>
          <span className="stat-sub">&nbsp;</span>
        </div>
        <div className="stat-item">
          <span className={`stat-value ${additionalCost > 0 ? 'remaining critical' : 'remaining good'}`}>
            {additionalCost > 0 ? `$${additionalCost.toFixed(2)}` : '—'}
          </span>
          <span className="stat-label">Additional Cost</span>
          <span className="stat-sub">
            {additionalCost > 0
              ? `${overHours.toFixed(2)} hr${overHours !== 1 ? 's' : ''} × $${OVERAGE_RATE}/hr`
              : 'within retainer'}
          </span>
        </div>
      </div>

      <div className="retainer-bar-wrap">
        <div className="retainer-bar-bg">
          <div
            className={`retainer-bar-fill ${barCls}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="retainer-bar-labels">
          <span>0 hrs</span>
          <span>{RETAINER_HOURS} hrs</span>
        </div>
      </div>
    </div>
  )
}

// ── NotesModal ─────────────────────────────────────────────────
function NotesModal({ note, onClose, onSave }) {
  const [value, setValue] = useState(note.notes ?? '')
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleSave() {
    onSave(note.id, 'notes', value)
    onClose()
  }

  return (
    <div className="notes-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="notes-modal">
        <div className="notes-modal-header">
          <div>
            <div className="section-label">Notes</div>
            <div className="notes-modal-task">{note.task || 'Untitled task'}</div>
          </div>
          <button className="notes-modal-close" onClick={onClose}>×</button>
        </div>
        <textarea
          ref={textareaRef}
          className="notes-modal-textarea"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Add notes…"
        />
        <div className="notes-modal-footer">
          <button className="notes-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="notes-modal-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── ProjectTable ───────────────────────────────────────────────
const FILTERS = ['All', 'Approved', 'On Hold', 'Completed']

function ProjectTable({ tasks, onUpdateField, onDeleteTask, onAddTask }) {
  const [filter, setFilter] = useState('All')
  const [expandedNote, setExpandedNote] = useState(null)

  const visible = filter === 'All' ? tasks : tasks.filter(t => t.status === filter)

  function handleAdd() {
    onAddTask()
    setFilter('All')
  }

  return (
    <>
    {expandedNote && (
      <NotesModal
        note={expandedNote}
        onClose={() => setExpandedNote(null)}
        onSave={onUpdateField}
      />
    )}
    <div className="projects-section">
      <div className="projects-toolbar">
        <div>
          <div className="section-label">Projects</div>
          <div className="retainer-title" style={{ fontSize: 20, marginBottom: 12 }}>
            Project Approvals &amp; Hour Tracking
          </div>
          <div className="projects-filters">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
                {f !== 'All' && (
                  <span style={{ opacity: 0.6, marginLeft: 4, fontWeight: 400 }}>
                    ({tasks.filter(t => t.status === f).length})
                  </span>
                )}
                {f === 'All' && (
                  <span style={{ opacity: 0.6, marginLeft: 4, fontWeight: 400 }}>
                    ({tasks.length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button className="add-task-btn" onClick={handleAdd}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Task
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Task</th>
              <th>Hour Estimate</th>
              <th>Actual Hours</th>
              <th>Timeline Estimate</th>
              <th>Notes</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="table-empty">
                  No tasks match this filter.
                </td>
              </tr>
            )}
            {visible.map(row => {
              const isOver = row.actualHours && row.hourEstimate &&
                Number(row.actualHours) > Number(row.hourEstimate)
              return (
                <tr key={row.id}>
                  {/* Status */}
                  <td>
                    <span className={`badge ${statusClass(row.status)}`}>
                      <select
                        className="status-select"
                        value={row.status}
                        onChange={e => onUpdateField(row.id, 'status', e.target.value)}
                        style={{ color: 'inherit', fontWeight: 'inherit' }}
                      >
                        {STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </span>
                  </td>

                  {/* Task */}
                  <td>
                    <input
                      className="inline-input task-name"
                      defaultValue={row.task}
                      key={`task-${row.id}-${row.task}`}
                      placeholder="Task name…"
                      onBlur={e => onUpdateField(row.id, 'task', e.target.value)}
                    />
                  </td>

                  {/* Hour Estimate */}
                  <td>
                    <input
                      className="inline-input hours"
                      type="number"
                      min="0"
                      defaultValue={row.hourEstimate}
                      key={`est-${row.id}-${row.hourEstimate}`}
                      placeholder="—"
                      onBlur={e => onUpdateField(row.id, 'hourEstimate', e.target.value)}
                    />
                    {row.hourEstimate ? <span style={{ fontSize: 12, color: 'var(--gray-text)', marginLeft: 2 }}>hrs</span> : null}
                  </td>

                  {/* Actual Hours */}
                  <td>
                    <input
                      className={`inline-input hours${isOver ? ' over' : ''}`}
                      type="number"
                      min="0"
                      defaultValue={row.actualHours}
                      key={`actual-${row.id}-${row.actualHours}`}
                      placeholder="—"
                      onBlur={e => onUpdateField(row.id, 'actualHours', e.target.value)}
                    />
                    {row.actualHours ? <span style={{ fontSize: 12, color: isOver ? '#a04040' : 'var(--gray-text)', marginLeft: 2 }}>hrs</span> : null}
                    {isOver && (
                      <div style={{ fontSize: 11, color: '#a04040', marginTop: 2 }}>
                        +{Number(row.actualHours) - Number(row.hourEstimate)} over
                      </div>
                    )}
                  </td>

                  {/* Timeline */}
                  <td>
                    <input
                      className="inline-input timeline-val"
                      defaultValue={row.timeline}
                      key={`timeline-${row.id}-${row.timeline}`}
                      placeholder="e.g. 2 weeks"
                      onBlur={e => onUpdateField(row.id, 'timeline', e.target.value)}
                    />
                  </td>

                  {/* Notes */}
                  <td className="notes-cell">
                    <input
                      className="inline-input notes"
                      defaultValue={row.notes}
                      key={`notes-${row.id}-${row.notes}`}
                      placeholder="Add notes…"
                      onBlur={e => onUpdateField(row.id, 'notes', e.target.value)}
                    />
                    <button
                      className="notes-expand-btn"
                      onClick={() => setExpandedNote(row)}
                      title="Expand notes"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.5 1.5H10.5V4.5M10.5 1.5L6.5 5.5M4.5 10.5H1.5V7.5M1.5 10.5L5.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>

                  {/* Delete */}
                  <td>
                    <button
                      className="row-delete-btn"
                      onClick={() => onDeleteTask(row.id)}
                      title="Remove row"
                    >×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {tasks.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-text)', textAlign: 'right' }}>
          Total estimated: <strong style={{ color: 'var(--brown)' }}>
            {tasks.reduce((s, t) => s + (Number(t.hourEstimate) || 0), 0)} hrs
          </strong>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          Total actual: <strong style={{ color: 'var(--brown)' }}>
            {tasks.reduce((s, t) => s + (Number(t.actualHours) || 0), 0)} hrs
          </strong>
        </div>
      )}
    </div>
    </>
  )
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState(() => loadFromStorage() ?? SAMPLE_TASKS)
  // null = connecting, true = Supabase live, string = error message
  const [liveMode, setLiveMode] = useState(null)
  const tasksRef = useRef(tasks)

  useEffect(() => { tasksRef.current = tasks }, [tasks])

  // ── Supabase: initial load ────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/tasks')
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
        if (data.length === 0) {
          await postTasks(SAMPLE_TASKS)
          setTasks(SAMPLE_TASKS)
        } else {
          setTasks(data)
        }
        setLiveMode(true)
      } catch (err) {
        setLiveMode(err?.message ?? 'API unreachable — using local storage')
      }
    }
    init()
  }, [])

  // ── Supabase: refresh when tab becomes visible ───────────────
  useEffect(() => {
    if (liveMode !== true) return

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetch('/api/tasks')
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && data.length > 0 && JSON.stringify(data) !== JSON.stringify(tasksRef.current)) {
              setTasks(data)
            }
          })
          .catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [liveMode])

  // ── Fallback: localStorage when Supabase not available ───────
  useEffect(() => {
    if (liveMode !== true) saveToStorage(tasks)
  }, [tasks, liveMode])

  // ── Write full tasks array to Supabase ───────────────────────
  async function postTasks(updated) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[postTasks] Supabase write failed:', err?.error ?? `HTTP ${res.status}`)
        return false
      }
      return true
    } catch (err) {
      console.error('[postTasks] Network error:', err?.message)
      return false
    }
  }

  // ── Task operations ──────────────────────────────────────────
  function updateField(id, field, value) {
    const parsed = (field === 'hourEstimate' || field === 'actualHours')
      ? (value === '' ? '' : Number(value))
      : value
    const updated = tasksRef.current.map(t => t.id === id ? { ...t, [field]: parsed } : t)
    setTasks(updated)
    if (liveMode === true) postTasks(updated)
  }

  function deleteTask(id) {
    const updated = tasksRef.current.filter(t => t.id !== id)
    setTasks(updated)
    if (liveMode === true) postTasks(updated)
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
    }
    const updated = [...tasksRef.current, newTask]
    setTasks(updated)
    if (liveMode === true) postTasks(updated)
  }

  const syncLabel =
    liveMode === null   ? '○ Connecting…' :
    liveMode === true   ? '● Live — changes sync for all viewers' :
    `⚠ ${liveMode}`

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-mark">V</div>
          <span className="header-logo-text">VaVia</span>
        </div>
        <span className="header-badge">Partner Dashboard</span>
      </header>

      <main className="main">
        <h1 className="page-title">Partner Dashboard</h1>
        <p className="page-subtitle">
          Track retainer hours and manage project approvals.
        </p>

        <RetainerUsage tasks={tasks} />
        <ProjectTable
          tasks={tasks}
          onUpdateField={updateField}
          onDeleteTask={deleteTask}
          onAddTask={addTask}
        />
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} VaVia — Partner Portal</span>
        <span className={`sync-status ${liveMode === true ? 'sync-live' : ''}`}>
          {syncLabel}
        </span>
      </footer>
    </div>
  )
}
