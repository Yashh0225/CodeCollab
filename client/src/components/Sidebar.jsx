import { useAwareness } from '../hooks/useAwareness'
import { generateInvite } from '../services/api'

export default function Sidebar({ isOpen, roomInfo, currentUser, provider, role }) {
  const onlineUsers = useAwareness(provider)

  // Ensure current user is included if offline/no-provider
  const usersToDisplay = onlineUsers.length > 0 
    ? onlineUsers 
    : [currentUser ? { ...currentUser, name: currentUser.username, role } : { name: 'Guest', color: '#7c6aef', role }]

  const handleInvite = async (inviteRole) => {
    try {
      const { token, link } = await generateInvite(roomInfo.id, inviteRole)
      await navigator.clipboard.writeText(window.location.origin + link)
      // We could use toast, but alert is fine for now
      alert(`Invite link for ${inviteRole} copied to clipboard!`)
    } catch (err) {
      alert('Failed to generate invite link')
    }
  }

  return (
    <div style={{
      width: isOpen ? 'var(--sidebar-width)' : '0px',
      transition: 'width 0.3s ease-in-out, border-color 0.3s ease-in-out',
      overflow: 'hidden',
      borderLeft: isOpen ? '1px solid var(--border-primary)' : '1px solid transparent',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      zIndex: 5,
    }}>
      <div style={{ width: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="sidebar-header">
        <span className="sidebar-title">Collaborators</span>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          background: 'var(--bg-tertiary)',
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {usersToDisplay.length} online
        </span>
      </div>

      <div className="sidebar-content">
        <div className="user-list">
          {usersToDisplay.map((u, i) => {
            const isMe = currentUser && u.name === currentUser.username
            return (
              <div className="user-item" key={`${u.name}-${i}`}>
                <div
                  className="user-avatar"
                  style={{ background: u.color || '#7c6aef' }}
                >
                  {(u.name || 'G').charAt(0).toUpperCase()}
                  <div className="online-dot" />
                </div>
                <div>
                  <div className="user-name">{u.name}</div>
                  <div className="user-status" style={{ textTransform: 'capitalize' }}>{u.role || 'viewer'}</div>
                </div>
                {isMe && <span className="user-badge">You</span>}
              </div>
            )
          })}
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

        {/* Leave Room & Actions Button */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-primary)', marginTop: 'auto' }}>
          {role === 'owner' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                onClick={() => handleInvite('editor')}
              >
                + Editor
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                onClick={() => handleInvite('viewer')}
              >
                + Viewer
              </button>
            </div>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              color: 'var(--color-error)', 
              borderColor: 'rgba(248, 113, 113, 0.2)',
              background: 'rgba(248, 113, 113, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(248, 113, 113, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.2)';
            }}
          >
            Leave Room
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
