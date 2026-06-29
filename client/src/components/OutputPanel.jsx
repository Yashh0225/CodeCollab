// ============================================
// CodeCollab — OutputPanel Component
// ============================================
// Collapsible bottom panel showing execution results

import { useState } from 'react'

export default function OutputPanel({ isOpen, data, isRunning, onClose, onClear }) {
  const [activeOutput, setActiveOutput] = useState('output') // 'output' or 'error'

  if (!isOpen) return null

  const hasStdout = data?.stdout && data.stdout.trim()
  const hasStderr = data?.stderr && data.stderr.trim()
  const hasCompileError = data?.compile_output && data.compile_output.trim()
  const hasError = data?.error
  const isSuccess = data?.status?.id === 3
  const statusDesc = data?.status?.description || ''

  return (
    <div style={{
      borderTop: '1px solid var(--border-primary)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '300px',
      minHeight: '120px',
      transition: 'all 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-tertiary)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Output
          </span>

          {/* Tab pills */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveOutput('output')}
              style={{
                padding: '2px 10px',
                fontSize: '11px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeOutput === 'output' ? 'var(--bg-hover)' : 'transparent',
                color: activeOutput === 'output' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: 500,
              }}
            >stdout</button>
            <button
              onClick={() => setActiveOutput('error')}
              style={{
                padding: '2px 10px',
                fontSize: '11px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: activeOutput === 'error' ? 'var(--bg-hover)' : 'transparent',
                color: (hasStderr || hasCompileError) 
                  ? (activeOutput === 'error' ? '#ef4444' : '#f87171')
                  : (activeOutput === 'error' ? 'var(--text-primary)' : 'var(--text-tertiary)'),
                fontWeight: 500,
              }}
            >
              stderr
              {(hasStderr || hasCompileError) && (
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  marginLeft: '4px',
                  verticalAlign: 'middle',
                }} />
              )}
            </button>
          </div>

          {/* Status + metrics */}
          {!isRunning && data && !hasError && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span style={{
                padding: '1px 6px',
                borderRadius: '3px',
                background: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: isSuccess ? '#10b981' : '#ef4444',
                fontWeight: 500,
              }}>
                {statusDesc}
              </span>
              {data.time && <span>⏱ {data.time}s</span>}
              {data.memory && <span>💾 {(data.memory / 1024).toFixed(1)} MB</span>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {onClear && (
            <button onClick={onClear} style={{
              background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
              cursor: 'pointer', fontSize: '11px', padding: '2px 6px',
            }}>Clear</button>
          )}
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px 16px',
      }}>
        {isRunning ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}>
            <div style={{
              width: '16px', height: '16px',
              border: '2px solid rgba(124, 106, 239, 0.2)',
              borderTopColor: '#7c6aef',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Running your code...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : hasError ? (
          <pre style={{
            margin: 0, fontSize: '13px', fontFamily: 'var(--font-mono)',
            color: '#ef4444', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{data.error}</pre>
        ) : activeOutput === 'output' ? (
          <pre style={{
            margin: 0, fontSize: '13px', fontFamily: 'var(--font-mono)',
            color: hasStdout ? '#10b981' : 'var(--text-tertiary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{hasStdout ? data.stdout : '(no output)'}</pre>
        ) : (
          <pre style={{
            margin: 0, fontSize: '13px', fontFamily: 'var(--font-mono)',
            color: (hasStderr || hasCompileError) ? '#ef4444' : 'var(--text-tertiary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{hasCompileError ? data.compile_output : hasStderr ? data.stderr : '(no errors)'}</pre>
        )}
      </div>
    </div>
  )
}
