import React, { useEffect, useState } from 'react';

export default function CrdtVisualizer({ ydoc, onClose }) {
  const [data, setData] = useState({});
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('state'); // 'state' or 'log'

  useEffect(() => {
    if (!ydoc) return;

    const updateData = () => {
      const code = ydoc.getText('code').toString();
      const metadata = ydoc.getMap('metadata').toJSON();
      
      const clientId = ydoc.clientID;
      const guid = ydoc.guid;
      
      setData({
        guid,
        clientId,
        metadata,
        codeLength: code.length,
        codePreview: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
        stateVector: Array.from(ydoc.store.clients.keys()).map(client => ({
          client,
          clock: ydoc.store.clients.get(client).length
        }))
      });
    };

    const handleUpdate = (update, origin) => {
      updateData();
      
      // Attempt to get a readable origin name (could be WebsocketProvider, local, etc)
      let originName = 'local';
      if (origin) {
        if (typeof origin === 'string') originName = origin;
        else if (origin.constructor && origin.constructor.name) originName = origin.constructor.name;
        else originName = 'remote';
      }

      setLogs(prevLogs => {
        const newLog = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          bytes: update.byteLength,
          origin: originName
        };
        return [newLog, ...prevLogs].slice(0, 50); // Keep last 50 events
      });
    };

    updateData();
    ydoc.on('update', handleUpdate);
    
    return () => {
      ydoc.off('update', handleUpdate);
    };
  }, [ydoc]);

  const tabStyle = {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'background 0.2s'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)', width: '650px', maxWidth: '90vw', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>CRDT Visualizer</h3>
            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <button 
                onClick={() => setActiveTab('state')}
                style={{ ...tabStyle, background: activeTab === 'state' ? 'var(--bg-hover)' : 'transparent' }}
              >State Vector</button>
              <button 
                onClick={() => setActiveTab('log')}
                style={{ ...tabStyle, background: activeTab === 'log' ? 'var(--bg-hover)' : 'transparent' }}
              >Operation Log</button>
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
