/* eslint-disable react/prop-types */

export default function Sidebar({ isOpen, roomInfo, currentUser }) {
  if (!isOpen) return null

  const user = currentUser || { username: 'Guest', color: '#7c6aef' }

  return (
    <div className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">Collaborators</span>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          background: 'var(--bg-tertiary)',
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          1 online
        </span>
      </div>

      <div className="sidebar-content">
        <div className="user-list">
          <div className="user-item">
            <div
              className="user-avatar"
              style={{ background: user.color }}
            >
              {user.username.charAt(0).toUpperCase()}
              <div className="online-dot" />
            </div>
            <div>
              <div className="user-name">{user.username}</div>
              <div className="user-status">Editing</div>
            </div>
            <span className="user-badge">You</span>
          </div>
        </div>

        {/* Room info section */}
        <div style={{ marginTop: '24px' }}>
          <div className="sidebar-title" style={{ marginBottom: '10px' }}>
            Room Info
          </div>
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Status</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>● Active</span>
            </div>
            {roomInfo && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Room</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {roomInfo.id?.substring(0, 10) || 'demo'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Language</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {roomInfo.language || 'javascript'}
                  </span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Mode</span>
              <span style={{ color: 'var(--text-secondary)' }}>Local (Phase 2)</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div style={{ marginTop: '24px' }}>
          <div className="sidebar-title" style={{ marginBottom: '10px' }}>
            Keyboard Shortcuts
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            {[
              ['Ctrl+S', 'Save snapshot'],
              ['Ctrl+/', 'Toggle comment'],
              ['Ctrl+D', 'Select word'],
              ['Alt+↑↓', 'Move line'],
              ['Ctrl+Shift+K', 'Delete line'],
            ].map(([key, desc]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                padding: '4px 0',
              }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{desc}</span>
                <kbd style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '4px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}>{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
