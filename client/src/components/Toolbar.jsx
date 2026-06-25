/* eslint-disable react/prop-types */
import { useState } from 'react'
// SVG Icons as components for the toolbar
const Icons = {
  Code: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Share: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  History: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Sidebar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Database: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
}

export default function Toolbar({
  language,
  onLanguageChange,
  languages,
  sidebarOpen,
  onToggleSidebar,
  roomId,
  onNavigateHome,
  historyOpen,
  onToggleHistory,
  onOpenVisualizer,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyRoomLink = () => {
    const url = `${window.location.origin}/room/${roomId || 'demo'}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="toolbar">
      {/* Brand */}
      <div className="toolbar-brand" onClick={onNavigateHome} style={{ cursor: onNavigateHome ? 'pointer' : 'default' }}>
        <div className="toolbar-logo">{'</>'}</div>
        <span className="toolbar-name">CodeCollab</span>
      </div>

      <div className="toolbar-divider" />

      {/* Room badge & Invite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="room-badge" style={{ userSelect: 'all' }}>
          <span className="room-badge-icon" style={{ userSelect: 'none', marginRight: '4px' }}>⚡</span>
          <span style={{ userSelect: 'all' }}>{roomId || 'demo-room'}</span>
        </div>
        <button 
          onClick={handleCopyRoomLink}
          style={{
            background: copied ? 'rgba(45, 212, 191, 0.15)' : 'var(--accent-glow)',
            color: copied ? '#2dd4bf' : 'var(--accent-secondary)',
            border: '1px solid',
            borderColor: copied ? 'rgba(45, 212, 191, 0.3)' : 'var(--border-accent)',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          {copied ? 'Copied!' : (
            <>
              <div style={{ width: '14px', height: '14px', display: 'flex' }}>
                <Icons.Copy />
              </div> 
              Invite
            </>
          )}
        </button>
      </div>

      {/* Language selector */}
      <div className="toolbar-section">
        <span className="toolbar-label">Language</span>
        <select
          className="select language-select"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          id="language-selector"
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-spacer" />

      {/* Action buttons */}
      <div className="toolbar-section">
        <button
          className="icon-btn tooltip-wrapper"
          data-tooltip="Share Room"
          onClick={handleCopyRoomLink}
          id="share-btn"
        >
          <Icons.Share />
        </button>

        <button
          className="icon-btn tooltip-wrapper"
          data-tooltip="Download Code"
          id="download-btn"
        >
          <Icons.Download />
        </button>

        <button
          className="icon-btn tooltip-wrapper"
          data-tooltip="Retrieve code"
          onClick={onToggleHistory}
          id="history-btn"
          style={{
            ...(historyOpen ? { color: 'var(--accent-primary)' } : {}),
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            width: 'auto',
            borderRadius: '6px'
          }}
        >
          <div style={{ width: '18px', height: '18px', display: 'flex' }}>
            <Icons.History />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>History</span>
        </button>

        <div className="toolbar-divider" />

        <button 
          className="icon-btn tooltip-wrapper" 
          data-tooltip="CRDT Visualizer"
          onClick={onOpenVisualizer}
        >
          <Icons.Database />
        </button>

        <button
          className="icon-btn tooltip-wrapper"
          data-tooltip={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          onClick={onToggleSidebar}
          id="sidebar-toggle-btn"
          style={sidebarOpen ? { color: 'var(--accent-primary)' } : {}}
        >
          <Icons.Sidebar />
        </button>
      </div>
    </div>
  )
}
