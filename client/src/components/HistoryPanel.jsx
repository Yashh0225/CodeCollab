import { useState, useEffect } from 'react'
import { saveSnapshot, listSnapshots } from '../services/api'

export default function HistoryPanel({ isOpen, roomId, ytext, onClose }) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch snapshots when panel opens or when a new one is saved
  const fetchSnapshots = async () => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    try {
      const data = await listSnapshots(roomId)
      setSnapshots(data.snapshots || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSnapshots()
  }, [isOpen, roomId])

  const handleSave = async () => {
    if (!ytext) return
    setIsSaving(true)
    try {
      const content = ytext.toString()
      await saveSnapshot(roomId, content)
      await fetchSnapshots()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestore = (content) => {
    if (!ytext) return
    if (!window.confirm("Are you sure you want to overwrite the current document for everyone with this snapshot?")) return
    
    // Replace content collaboratively
    ytext.doc.transact(() => {
      ytext.delete(0, ytext.length)
      ytext.insert(0, content)
    })
  }

  return (
    <div style={{
      width: isOpen ? '280px' : '0px',
      transition: 'width 0.3s ease-in-out, border-color 0.3s ease-in-out',
      overflow: 'hidden',
      borderRight: isOpen ? '1px solid var(--border-primary)' : '1px solid transparent',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      zIndex: 100,
    }}>
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="sidebar-title">Session History</h3>
          <button onClick={onClose} className="icon-btn tooltip-wrapper" data-tooltip="Close" style={{ padding: '4px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-primary)' }}>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="btn btn-primary"
            style={{ width: '100%', padding: '8px' }}
          >
            {isSaving ? 'Saving...' : 'Save Current State'}
          </button>
          {error && <div style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
        </div>

        <div className="user-list" style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
          {loading && <div className="user-item">Loading snapshots...</div>}
          {!loading && snapshots.length === 0 && (
            <div className="user-item" style={{ color: 'var(--text-secondary)' }}>
              No snapshots found for this room.
            </div>
          )}
          
          {!loading && snapshots.map((snap) => (
            <div key={snap.id} className="user-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {new Date(snap.saved_at).toLocaleString()}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '11px', 
                fontFamily: 'var(--font-mono)', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '6px', 
                borderRadius: '4px',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)'
              }}>
                {snap.content ? snap.content.substring(0, 50) + '...' : '(Empty)'}
              </div>
              
              <button 
                onClick={() => handleRestore(snap.content)}
                style={{
                  background: 'rgba(124, 106, 239, 0.1)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(124, 106, 239, 0.2)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px'
                }}
              >
                Restore Snapshot
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
