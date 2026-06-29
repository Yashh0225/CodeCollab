import React, { useEffect, useState, useRef } from 'react';

// Simple hash function to fingerprint document content
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash >>> 0; // unsigned
}

export default function CrdtVisualizer({ isOpen, ydoc, onClose }) {
  const [data, setData] = useState({});
  const [logs, setLogs] = useState([]);
  const [convergenceLog, setConvergenceLog] = useState([]);
  const [activeTab, setActiveTab] = useState('state'); // 'state', 'log', or 'convergence'
  const prevHashRef = useRef(null);
  const prevClocksRef = useRef(null);

  useEffect(() => {
    if (!ydoc) return;

    const updateData = () => {
      const code = ydoc.getText('code').toString();
      const metadata = ydoc.getMap('metadata').toJSON();
      
      const clientId = ydoc.clientID;
      const guid = ydoc.guid;
      
      const stateVector = Array.from(ydoc.store.clients.keys()).map(client => ({
        client,
        clock: ydoc.store.clients.get(client).length
      }));

      setData({
        guid,
        clientId,
        metadata,
        codeLength: code.length,
        codePreview: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
        stateVector
      });

      return { code, stateVector };
    };

    const handleUpdate = (update, origin, doc, tr) => {
      const { code, stateVector } = updateData();
      
      // Robustly check origin using the transaction's local flag
      let originName = 'unknown';
      if (tr) {
        originName = tr.local ? 'local' : 'remote';
      } else if (origin) {
        originName = typeof origin === 'string' ? origin : 'remote';
      } else {
        originName = 'local';
      }

      // Operation log entry
      setLogs(prevLogs => {
        const newLog = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          bytes: update.byteLength,
          origin: originName
        };
        return [newLog, ...prevLogs].slice(0, 50);
      });

      // Convergence tracking
      const currentHash = simpleHash(code);
      const clockSum = stateVector.reduce((sum, sv) => sum + sv.clock, 0);
      const peerCount = stateVector.length;
      
      // Detect divergence (hash changed from remote update) or convergence
      const prevHash = prevHashRef.current;
      const prevClocks = prevClocksRef.current;
      
      if (prevHash !== null && prevHash !== currentHash) {
        // Clock values changed → check if all peers are now aligned
        const allClocksEqual = stateVector.every(sv => 
          stateVector.every(other => sv.clock === other.clock)
        );
        
        setConvergenceLog(prev => {
          const entry = {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            hash: currentHash.toString(16).toUpperCase(),
            peerCount,
            clockSum,
            origin: originName,
            type: originName === 'remote' ? 'sync' : 'edit',
          };
          return [entry, ...prev].slice(0, 30);
        });
      }

      prevHashRef.current = currentHash;
      prevClocksRef.current = stateVector.map(sv => sv.clock);
    };

    updateData();
    ydoc.on('update', handleUpdate);
    
    return () => {
      ydoc.off('update', handleUpdate);
    };
  }, [ydoc]);

  const tabStyle = {
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'background 0.2s'
  };

  const currentHash = data.codeLength !== undefined ? simpleHash(
    ydoc ? ydoc.getText('code').toString() : ''
  ).toString(16).toUpperCase() : '—';

  return (
    <div style={{
      width: isOpen ? '450px' : '0px',
      transition: 'width 0.3s ease-in-out, border-color 0.3s ease-in-out',
      overflow: 'hidden',
      borderLeft: isOpen ? '1px solid var(--border-primary)' : '1px solid transparent',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      zIndex: 5,
    }}>
      <div style={{
        width: '450px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>CRDT Logs</h3>
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <button 
                onClick={() => setActiveTab('state')}
                style={{ ...tabStyle, background: activeTab === 'state' ? 'var(--bg-hover)' : 'transparent' }}
              >State</button>
              <button 
                onClick={() => setActiveTab('log')}
                style={{ ...tabStyle, background: activeTab === 'log' ? 'var(--bg-hover)' : 'transparent' }}
              >Ops</button>
              <button 
                onClick={() => setActiveTab('convergence')}
                style={{ ...tabStyle, background: activeTab === 'convergence' ? 'var(--bg-hover)' : 'transparent' }}
              >Convergence</button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'state' ? (
            <>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                This panel shows the raw Conflict-Free Replicated Data Type (CRDT) structures synchronized across all peers. 
                The <strong>stateVector</strong> represents the logical clocks used for decentralized sync negotiation.
              </div>
              <pre style={{
                background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)',
                fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all'
              }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </>
          ) : activeTab === 'log' ? (
            <>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Live feed of discrete CRDT operations. Every keystroke is encoded as a binary update and broadcast to peers.
              </div>
              <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-primary)' }}>Time</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-primary)' }}>Origin</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-primary)' }}>Payload Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Waiting for updates... Type in the editor!</td></tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{log.time}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ 
                              background: log.origin === 'local' ? 'rgba(124, 106, 239, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: log.origin === 'local' ? 'var(--accent-primary)' : '#10b981',
                              padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500
                            }}>
                              {log.origin}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{log.bytes} bytes</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Convergence Tab */
            <>
              <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Visible proof that CRDT conflict resolution works. When two peers edit simultaneously, 
                their document hashes diverge momentarily — then <strong>mathematically converge</strong> to the same state 
                without any central server coordination.
              </div>

              {/* Live metrics */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'
              }}>
                <div style={{
                  background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Peer Count</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    {data.stateVector?.length || 0}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>distinct clients</div>
                </div>
                <div style={{
                  background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Document Hash</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    0x{currentHash}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>content fingerprint</div>
                </div>
              </div>

              {/* Clock convergence per peer */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Logical Clocks (per peer)
                </div>
                {data.stateVector?.map(sv => {
                  const maxClock = Math.max(...(data.stateVector?.map(s => s.clock) || [1]), 1);
                  const pct = (sv.clock / maxClock) * 100;
                  const isLocal = sv.client === data.clientId;
                  return (
                    <div key={sv.client} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                        <span style={{ color: isLocal ? 'var(--accent-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {isLocal ? `${sv.client} (you)` : sv.client}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          clock: {sv.clock}
                        </span>
                      </div>
                      <div style={{
                        height: '4px', borderRadius: '2px', background: 'var(--bg-tertiary)', overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: isLocal ? 'var(--accent-primary)' : '#10b981',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Convergence event log */}
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Sync Timeline
              </div>
              <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    <tr>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-primary)' }}>Time</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-primary)' }}>Event</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-primary)' }}>Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convergenceLog.length === 0 ? (
                      <tr><td colSpan="3" style={{ padding: '14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        Open the editor in another tab and type simultaneously to see convergence events
                      </td></tr>
                    ) : (
                      convergenceLog.map(entry => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{entry.time}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <span style={{
                              padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 500,
                              background: entry.origin === 'remote' ? 'rgba(16,185,129,0.1)' : 'rgba(124,106,239,0.1)',
                              color: entry.origin === 'remote' ? '#10b981' : 'var(--accent-primary)'
                            }}>
                              {entry.origin === 'remote' ? '⟵ sync' : '⟶ edit'}
                            </span>
                            <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                              {entry.peerCount} peers
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            0x{entry.hash}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
