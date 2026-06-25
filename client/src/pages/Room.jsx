import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Editor from '../components/Editor'
import Toolbar from '../components/Toolbar'
import Sidebar from '../components/Sidebar'
import HistoryPanel from '../components/HistoryPanel'
import CrdtVisualizer from '../components/CrdtVisualizer'
import StatusBar from '../components/StatusBar'
import { useAwareness } from '../hooks/useAwareness'
import { getRoom, getUser, isAuthenticated, updateRoomLanguage, fetchRoomRole, joinRoom } from '../services/api'

export default function Room() {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [language, setLanguage] = useState('javascript')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [visualizerOpen, setVisualizerOpen] = useState(false)
  const [roomInfo, setRoomInfo] = useState(null)
  const [role, setRole] = useState('none')
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const user = getUser()
  const ymetaRef = useRef(null)

  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang) // Optimistic local update
    setRoomInfo(prev => prev ? { ...prev, language: newLang } : null)
    
    // 1. Instant sync to active users via Yjs
    if (ymetaRef.current) {
      ymetaRef.current.set('language', newLang)
    }

    // 2. Permanent save to Database
    try {
      await updateRoomLanguage(roomId, newLang)
    } catch (err) {
      console.error('Failed to save language to DB', err)
    }
  }

  useEffect(() => {
    loadRoom()
  }, [roomId])

  const loadRoom = async () => {
    if (!isAuthenticated()) {
      const currentUrl = location.pathname + location.search
      navigate(`/?login=true&redirect=${encodeURIComponent(currentUrl)}`, { replace: true })
      return
    }

    try {
      // Check for invite token
      const urlParams = new URLSearchParams(location.search)
      const inviteToken = urlParams.get('invite')
      if (inviteToken && isAuthenticated()) {
        try {
          await joinRoom(roomId, inviteToken)
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (err) {
          console.error('Failed to join via invite:', err)
        }
      }

      // Fetch room and role
      const [roomData, roleData] = await Promise.all([
        getRoom(roomId),
        isAuthenticated() ? fetchRoomRole(roomId).catch(() => ({ role: 'none' })) : { role: 'none' }
      ])
      
      setRoomInfo(roomData.room)
      if (roomData.room.language) {
        setLanguage(roomData.room.language)
      }
      setRole(roleData.role || 'none')
    } catch {
      // Room might not exist in DB yet — that's OK for demo mode
      setRoomInfo({ id: roomId, name: `Room ${roomId}`, language: 'javascript' })
      setRole('owner') // Default to owner in demo mode
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
    ydoc,
    status,
    ymeta,
  } = Editor({ roomId, language, onLanguageChange: handleLanguageChange, role })

  // Listen to remote language changes from Yjs
  useEffect(() => {
    ymetaRef.current = ymeta
    if (!ymeta) return
    
    const observer = () => {
      const remoteLang = ymeta.get('language')
      if (remoteLang) {
        setLanguage(prev => remoteLang !== prev ? remoteLang : prev)
        setRoomInfo(prev => prev ? { ...prev, language: remoteLang } : null)
      }
    }
    
    ymeta.observe(observer)
    // Also sync the initial value if one exists in Yjs
    const initialLang = ymeta.get('language')
    if (initialLang) {
      setLanguage(prev => initialLang !== prev ? initialLang : prev)
      setRoomInfo(prev => prev ? { ...prev, language: initialLang } : null)
    }

    return () => ymeta.unobserve(observer)
  }, [ymeta])

  // Track online users to show toast notifications
  const onlineUsers = useAwareness(provider)
  const prevUsersRef = useRef([])
  
  useEffect(() => {
    if (loading || !provider) return
    
    const prevUsers = prevUsersRef.current
    const currentUsers = onlineUsers.map(u => u.name)
    const prevUsernames = prevUsers.map(u => u.name)
    
    // Find joined users
    const joined = currentUsers.filter(u => !prevUsernames.includes(u) && u !== user?.username)
    // Find left users
    const left = prevUsernames.filter(u => !currentUsers.includes(u) && u !== user?.username)
    
    const newToasts = []
    joined.forEach(u => newToasts.push({ id: Date.now() + Math.random(), msg: `${u} joined the room`, type: 'join' }))
    left.forEach(u => newToasts.push({ id: Date.now() + Math.random(), msg: `${u} left the room`, type: 'leave' }))
    
    if (newToasts.length > 0) {
      setToasts(prev => [...prev, ...newToasts])
      // Auto dismiss toasts
      setTimeout(() => {
        setToasts(prev => prev.filter(t => !newToasts.map(n => n.id).includes(t.id)))
      }, 3000)
    }
    
    prevUsersRef.current = onlineUsers
  }, [onlineUsers, loading, provider, user?.username])

  const handleDownload = () => {
    if (!ytext) return
    const content = ytext.toString()
    
    const extMap = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      csharp: 'cs',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md'
    }
    const ext = extMap[language] || 'txt'
    const filename = `codecollab-${roomId || 'export'}.${ext}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
        onLanguageChange={handleLanguageChange}
        languages={languages}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        roomId={roomId}
        onNavigateHome={() => navigate('/')}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        onOpenVisualizer={() => setVisualizerOpen(true)}
        onDownload={handleDownload}
      />

      {/* Main Content: Editor + Sidebar */}
      <div className="main-content">
        <HistoryPanel
          isOpen={historyOpen}
          roomId={roomId}
          ytext={ytext}
          language={language}
          role={role}
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
          role={role}
        />
        <CrdtVisualizer 
          isOpen={visualizerOpen}
          ydoc={ydoc} 
          onClose={() => setVisualizerOpen(false)} 
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        language={language}
        cursorPosition={cursorPosition}
        wordCount={wordCount}
        connected={synced}
        status={status}
        roomId={roomId}
      />

      {/* Toast Notifications */}
      <div style={{
        position: 'fixed',
        bottom: '40px',
        right: sidebarOpen ? 'calc(var(--sidebar-width) + 20px)' : '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 300,
        pointerEvents: 'none',
        transition: 'right 0.3s ease-in-out'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className="fade-in" style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${toast.type === 'join' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
            boxShadow: 'var(--shadow-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: toast.type === 'join' ? 'var(--color-success)' : 'var(--color-error)'
            }} />
            {toast.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
