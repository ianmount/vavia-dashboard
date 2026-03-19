import { useState } from 'react'
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

// ── RetainerUsage ──────────────────────────────────────────────
function RetainerUsage({ tasks }) {
  const used = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0)
  const remaining = RETAINER_HOURS - used
  const overHours = Math.max(used - RETAINER_HOURS, 0)
  const additionalCost = overHours * OVERAGE_RATE
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
            {remaining < 0 ? `+${Math.abs(remaining)} over` : remaining}
          </span>
          <span className="stat-label">
            {remaining < 0 ? 'Hours Over Retainer' : 'Hours Remaining'}
          </span>
          <span className="stat-sub">&nbsp;</span>
        </div>
        <div className="stat-item">
          <span className={`stat-value ${additionalCost > 0 ? 'remaining critical' : 'remaining good'}`}>
            {additionalCost > 0 ? `$${additionalCost.toLocaleString()}` : '—'}
          </span>
          <span className="stat-label">Additional Cost</span>
          <span className="stat-sub">
            {additionalCost > 0
              ? `${overHours} hr${overHours !== 1 ? 's' : ''} × $${OVERAGE_RATE}/hr`
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

// ── ProjectTable ───────────────────────────────────────────────
const FILTERS = ['All', 'Approved', 'On Hold', 'Completed']

function ProjectTable({ tasks, setTasks }) {
  const [filter, setFilter] = useState('All')

  const visible = filter === 'All' ? tasks : tasks.filter(t => t.status === filter)

  function addTask() {
    setTasks(prev => [...prev, {
      id: nextId(),
      status: 'Approved',
      task: '',
      hourEstimate: '',
      timeline: '',
      notes: '',
      actualHours: '',
    }])
    setFilter('All')
  }

  function updateField(id, field, value) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
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
        <button className="add-task-btn" onClick={addTask}>
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
                        onChange={e => updateField(row.id, 'status', e.target.value)}
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
                      value={row.task}
                      placeholder="Task name…"
                      onChange={e => updateField(row.id, 'task', e.target.value)}
                    />
                  </td>

                  {/* Hour Estimate */}
                  <td>
                    <input
                      className="inline-input hours"
                      type="number"
                      min="0"
                      value={row.hourEstimate}
                      placeholder="—"
                      onChange={e => updateField(row.id, 'hourEstimate', e.target.value)}
                    />
                    {row.hourEstimate ? <span style={{ fontSize: 12, color: 'var(--gray-text)', marginLeft: 2 }}>hrs</span> : null}
                  </td>

                  {/* Actual Hours */}
                  <td>
                    <input
                      className={`inline-input hours${isOver ? ' over' : ''}`}
                      type="number"
                      min="0"
                      value={row.actualHours}
                      placeholder="—"
                      onChange={e => updateField(row.id, 'actualHours', e.target.value)}
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
                      value={row.timeline}
                      placeholder="e.g. 2 weeks"
                      onChange={e => updateField(row.id, 'timeline', e.target.value)}
                    />
                  </td>

                  {/* Notes */}
                  <td>
                    <input
                      className="inline-input notes"
                      value={row.notes}
                      placeholder="Add notes…"
                      onChange={e => updateField(row.id, 'notes', e.target.value)}
                    />
                  </td>

                  {/* Delete */}
                  <td>
                    <button
                      className="row-delete-btn"
                      onClick={() => deleteTask(row.id)}
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
  )
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS)

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
          Track retainer hours and manage project approvals with your VaVia team.
        </p>

        <RetainerUsage tasks={tasks} />
        <ProjectTable tasks={tasks} setTasks={setTasks} />
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} VaVia — Partner Portal</span>
        <span style={{ opacity: 0.6 }}>All data is session-only</span>
      </footer>
    </div>
  )
}
