export default function StatusBar({ language, cursorPosition, wordCount, connected, status }) {
  const isOnline = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="statusbar">
      <div className="statusbar-item">
        <div className={`statusbar-dot ${isOnline ? 'online' : (isConnecting ? 'connecting' : 'offline')}`} style={isConnecting ? { background: '#eab308', boxShadow: '0 0 8px rgba(234, 179, 8, 0.5)' } : {}} />
        <span>{isOnline ? 'Connected' : (isConnecting ? 'Connecting...' : 'Disconnected (Read Only)')}</span>
      </div>

      <div className="statusbar-item">
        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
      </div>

      <div className="statusbar-item">
        <span>{wordCount} words</span>
      </div>

      <div className="statusbar-spacer" />

      <div className="statusbar-item">
        <span>{language.charAt(0).toUpperCase() + language.slice(1)}</span>
      </div>

      <div className="statusbar-item">
        <span>UTF-8</span>
      </div>

      <div className="statusbar-item">
        <span>Spaces: 2</span>
      </div>

      <div className="statusbar-item" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
        CodeCollab v1.0
      </div>
    </div>
  )
}
