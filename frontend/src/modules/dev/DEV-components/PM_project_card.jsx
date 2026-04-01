import React from 'react'

const getProgressColor = () => 'bg-teal-500'

const getStatusPillClasses = () => 'bg-teal-50 text-black border border-teal-200'

const normalizeStatus = (rawStatus) => {
  const s = String(rawStatus || '').toLowerCase()
  if (s.includes('hold')) return 'On Hold'
  if (s.includes('block')) return 'Blocked'
  if (s === 'completed' || s.includes('complete')) return 'Completed'
  if (s === 'planning') return 'Planning'
  if (s === 'testing') return 'Testing'
  if (s === 'active' || s === 'in-progress' || s.includes('progress')) return 'In Progress'
  if (s === 'cancelled') return 'Cancelled'
  if (s === 'untouched') return 'New'
  return 'In Progress'
}

const PM_project_card = ({
  name,
  description,
  progress = 0,
  status = 'In Progress',
  client,
  owner,
  accelerated = false,
  dueDate,
}) => {
  const progressColor = getProgressColor()
  const statusClasses = getStatusPillClasses()
  const normalizedStatus = normalizeStatus(status)

  return (
    <div className="group h-full rounded-xl border border-teal-200 hover:border-teal-300 bg-white p-4 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 ring-1 ring-teal-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7.5A1.5 1.5 0 014.5 6h5.379a1.5 1.5 0 011.06.44l1.621 1.62a1.5 1.5 0 001.06.44H19.5A1.5 1.5 0 0121 9v7.5A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5V7.5z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-black" title={name}>{name}</h3>
            {(client || owner) && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-black">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 19.5a7.5 7.5 0 0115 0" />
                </svg>
                <span className="truncate">Client: {client || owner}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {accelerated && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 ring-1 ring-teal-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-amber-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" />
              </svg>
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses}`}>
            {normalizedStatus}
          </span>
        </div>
      </div>

      {description && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-black" title={description}>{description}</p>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-black">
          <span className="inline-flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Progress
          </span>
          <span className="font-medium">{Number(progress) || 0}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full rounded-full bg-teal-100">
          <div
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${Math.max(0, Math.min(100, Number(progress) || 0))}%` }}
          />
        </div>
      </div>

      {(dueDate) && (
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-1 text-xs text-black">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3M3.75 8.25h16.5M5 21h14a2 2 0 002-2V8.25H3v10.75A2 2 0 005 21z" />
            </svg>
            Due: {dueDate}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-black hover:underline"
          >
            <span>View details</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 text-teal-700">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default PM_project_card

