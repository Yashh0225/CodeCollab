import React, { useEffect, useState } from 'react';

export default function CrdtVisualizer({ ydoc, onClose }) {
  const [data, setData] = useState({});

  useEffect(() => {
    if (!ydoc) return;

    const updateData = () => {
      // Extract state from the document
      const code = ydoc.getText('code').toString();
      const metadata = ydoc.getMap('metadata').toJSON();
      
      // Get internal CRDT metadata
      const clientId = ydoc.clientID;
      const guid = ydoc.guid;
      
      setData({
        guid,
        clientId,
        metadata,
        codeLength: code.length,
        // We trim the code for visualization so it doesn't overflow massively
        codePreview: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
        stateVector: Array.from(ydoc.store.clients.keys()).map(client => ({
          client,
          clock: ydoc.store.clients.get(client).length
        }))
      });
    };

    updateData();
    
    // Listen to all document updates
    ydoc.on('update', updateData);
    
    return () => {
      ydoc.off('update', updateData);
    };
  }, [ydoc]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>CRDT Internal State Visualizer</h3>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer'
          }}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            This panel shows the raw Conflict-Free Replicated Data Type (CRDT) structures synchronized across all peers by Yjs.
          </div>
          
          <pre style={{
            background: 'var(--bg-tertiary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
