import { useState, useEffect } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import Editor from './Editor'

const API = 'http://localhost:3000'

function App() {
  const [docs, setDocs] = useState([])
  const [activeDocId, setActiveDocId] = useState(null)

  // Load all documents for the sidebar
  useEffect(() => {
    fetch(`${API}/docs`)
      .then(r => r.json())
      .then(data => {
        setDocs(data)
        // Set the first doc as active if none selected
        if (data.length > 0 && !activeDocId) {
          setActiveDocId(data[0].id)
          localStorage.setItem('docId', data[0].id)
        }
      })
  }, [])

  // Create a new document
  const createDoc = async () => {
    const res = await fetch(`${API}/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled' })
    })
    const newDoc = await res.json()
    setDocs(prev => [newDoc, ...prev])
    setActiveDocId(newDoc.id)
    localStorage.setItem('docId', newDoc.id)
  }

  // Switch to a different document
  const openDoc = (id) => {
    setActiveDocId(id)
    localStorage.setItem('docId', id)
  }

  const deleteDoc = async (e, id) => {
  e.stopPropagation() // prevents opening the doc when clicking delete
  const confirmed = window.confirm('Are you sure you want to delete this document? This cannot be undone.')
  if (!confirmed) return

  await fetch(`${API}/docs/${id}`, { method: 'DELETE' })

  const remaining = docs.filter(d => d.id !== id)
  setDocs(remaining)

  // If deleted doc was open, switch to next one or clear
  if (activeDocId === id) {
    if (remaining.length > 0) {
      setActiveDocId(remaining[0].id)
      localStorage.setItem('docId', remaining[0].id)
    } else {
      setActiveDocId(null)
      localStorage.removeItem('docId')
    }
  }
}

  // Update title in sidebar when Editor changes it
  const updateDocTitle = (id, newTitle) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d))
  }

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">My Documents</h2>
          <button
            onClick={createDoc}
            className="text-xl font-bold text-blue-600 hover:text-blue-800"
            title="New document">
            +
          </button>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-400">No documents yet. Click + to create one.</p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto">
            {docs.map(doc => (
  <div
    key={doc.id}
    onClick={() => openDoc(doc.id)}
    className={`group flex justify-between items-center px-3 py-2 rounded cursor-pointer text-sm ${
      activeDocId === doc.id
        ? 'bg-blue-100 text-blue-800 font-medium'
        : 'hover:bg-gray-100 text-gray-700'
    }`}>
    <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
    <button
      onClick={(e) => deleteDoc(e, doc.id)}
      className="hidden group-hover:block text-red-400 hover:text-red-600 ml-2 text-lg leading-none"
      title="Delete document">
      ×
    </button>
  </div>
))}
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-medium">
            {docs.find(d => d.id === activeDocId)?.title || 'Untitled Document'}
          </h1>
          <SignedIn><UserButton /></SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-1 bg-blue-600 text-white rounded text-sm">Sign In</button>
            </SignInButton>
          </SignedOut>
        </div>

        <div className="flex-1 p-10 bg-white m-6 rounded shadow overflow-auto">
          <SignedIn>
            {activeDocId
              ? <Editor key={activeDocId} docId={activeDocId} onTitleChange={updateDocTitle} />
              : <p className="text-gray-400 text-center mt-20">Click + to create a new document.</p>
            }
          </SignedIn>
          <SignedOut>
            <p className="text-gray-400 text-center mt-20">Please sign in to edit documents.</p>
          </SignedOut>
        </div>
      </div>

    </div>
  )
}

export default App