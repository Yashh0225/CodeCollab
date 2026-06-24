import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '../components/Editor'
import Toolbar from '../components/Toolbar'
import Sidebar from '../components/Sidebar'
import HistoryPanel from '../components/HistoryPanel'
import StatusBar from '../components/StatusBar'
import { getRoom, getUser, isAuthenticated } from '../services/api'

export default function Room() {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const [language, setLanguage] = useState('javascript')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const user = getUser()

  useEffect(() => {
    loadRoom()
  }, [roomId])

  const loadRoom = async () => {
    try {
      const data = await getRoom(roomId)
      setRoomInfo(data.room)
      if (data.room.language) {
        setLanguage(data.room.language)
      }
    } catch {
      // Room might not exist in DB yet — that's OK for demo mode
      setRoomInfo({ id: roomId, name: `Room ${roomId}`, language: 'javascript' })
    } finally {
      setLoading(false)
    }
  }

  const {
    editorComponent,
    cursorPosition,
    wordCount,
    languages,
    synced,
    provider,
    ytext,
  } = Editor({ roomId, language, onLanguageChange: setLanguage })

  if (loading) {
    return (
      <div className="app-layout" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(124, 106, 239, 0.2)',
            borderTopColor: '#7c6aef',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span>Loading room...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      {/* Top Toolbar */}
      <Toolbar
        language={language}
        onLanguageChange={setLanguage}
        languages={languages}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        roomId={roomId}
        onNavigateHome={() => navigate('/')}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
      />

      {/* Main Content: Editor + Sidebar */}
      <div className="main-content">
        <HistoryPanel
          isOpen={historyOpen}
          roomId={roomId}
          ytext={ytext}
          onClose={() => setHistoryOpen(false)}
        />
        <div className="editor-area" onClickCapture={() => historyOpen && setHistoryOpen(false)}>
          {editorComponent}
        </div>
        <Sidebar
          isOpen={sidebarOpen}
          roomInfo={roomInfo}
          currentUser={user}
          provider={provider}
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        language={language}
        cursorPosition={cursorPosition}
        wordCount={wordCount}
        connected={synced}
        roomId={roomId}
      />
    </div>
  )
}
