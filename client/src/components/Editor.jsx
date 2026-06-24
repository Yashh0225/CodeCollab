import { useState, useCallback, useRef, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { MonacoBinding } from 'y-monaco'
import { useYjs } from '../hooks/useYjs'

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: '.js' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
  { id: 'python', label: 'Python', ext: '.py' },
  { id: 'java', label: 'Java', ext: '.java' },
  { id: 'cpp', label: 'C++', ext: '.cpp' },
  { id: 'c', label: 'C', ext: '.c' },
  { id: 'csharp', label: 'C#', ext: '.cs' },
  { id: 'go', label: 'Go', ext: '.go' },
  { id: 'rust', label: 'Rust', ext: '.rs' },
  { id: 'html', label: 'HTML', ext: '.html' },
  { id: 'css', label: 'CSS', ext: '.css' },
  { id: 'json', label: 'JSON', ext: '.json' },
  { id: 'sql', label: 'SQL', ext: '.sql' },
  { id: 'markdown', label: 'Markdown', ext: '.md' },
  { id: 'yaml', label: 'YAML', ext: '.yml' },
  { id: 'php', label: 'PHP', ext: '.php' },
  { id: 'ruby', label: 'Ruby', ext: '.rb' },
  { id: 'swift', label: 'Swift', ext: '.swift' },
  { id: 'kotlin', label: 'Kotlin', ext: '.kt' },
  { id: 'shell', label: 'Shell', ext: '.sh' },
]

const DEFAULT_CODE = {
  javascript: `// Welcome to CodeCollab! 🚀
// Start coding together in real-time.

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Generate first 10 Fibonacci numbers
const results = [];
for (let i = 0; i < 10; i++) {
  results.push(fibonacci(i));
}

console.log('Fibonacci sequence:', results);
console.log('Sum:', results.reduce((a, b) => a + b, 0));
`,
  python: `# Welcome to CodeCollab! 🚀
# Start coding together in real-time.

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Generate first 10 Fibonacci numbers
results = [fibonacci(i) for i in range(10)]

print(f"Fibonacci sequence: {results}")
print(f"Sum: {sum(results)}")
`,
  typescript: `// Welcome to CodeCollab! 🚀
// Start coding together in real-time.

interface User {
  id: string;
  name: string;
  color: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}! Your color is \${user.color}\`;
}

const user: User = {
  id: "1",
  name: "Developer",
  color: "#7c6aef"
};

console.log(greet(user));
`,
}

export default function Editor({ roomId, language, onLanguageChange }) {
  const editorRef = useRef(null)
  const bindingRef = useRef(null)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [wordCount, setWordCount] = useState(0)
  
  const { ydoc, ytext, synced, provider, status } = useYjs(roomId)

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    // Bind Yjs to Monaco
    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider ? provider.awareness : null
    )

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      })
    })

    // Track content changes for word count
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue()
      const words = content.trim().split(/\s+/).filter(w => w.length > 0).length
      setWordCount(words)
    })

    // Initial word count
    const content = editor.getValue()
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length
    setWordCount(words)

    // Focus the editor
    editor.focus()
  }, [ytext])

  // Cleanup binding on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy()
      }
    }
  }, [])

  const getDefaultValue = useCallback(() => {
    return DEFAULT_CODE[language] || `// Start coding in ${language}...\n`
  }, [language])

  return {
    editorComponent: (
      <div className="editor-container" style={{ display: 'flex', flexDirection: 'column' }}>
        {status !== 'connected' && (
          <div style={{
            background: status === 'connecting' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: status === 'connecting' ? '#eab308' : '#ef4444',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderBottom: `1px solid ${status === 'connecting' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'connecting' ? '#eab308' : '#ef4444', animation: status === 'connecting' ? 'pulse 2s infinite' : 'none' }} />
            {status === 'connecting' ? 'Connecting to sync server...' : 'Disconnected — Read Only Mode'}
          </div>
        )}
        <div style={{ flex: 1, position: 'relative' }}>
          <MonacoEditor
            height="100%"
            language={language}
            theme="vs-dark"
          defaultValue={getDefaultValue()}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            letterSpacing: 0.3,
            minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            cursorStyle: 'line',
            cursorWidth: 2,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            padding: { top: 16, bottom: 16 },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            tabSize: 2,
            wordWrap: 'off',
            automaticLayout: true,
            contextmenu: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'mouseover',
            links: true,
            colorDecorators: true,
            readOnly: !synced, // Disable editing until initial sync is complete
          }}
          loading={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: '#1e1e2e',
              color: '#9896a8',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              gap: '10px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(124, 106, 239, 0.2)',
                borderTopColor: '#7c6aef',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Connecting to sync server...
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }
        />
        </div>
      </div>
    ),
    cursorPosition,
    wordCount,
    editorRef,
    languages: LANGUAGES,
    synced,
    provider,
    ytext,
    status,
  }
}
