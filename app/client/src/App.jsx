import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import Editor from './Editor'

function App() {
  return (
    <div className="flex h-screen bg-gray-100">

      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-4">My Documents</h2>
        <p className="text-sm text-gray-400">No documents yet.</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-medium">Untitled Document</h1>
          <SignedIn><UserButton /></SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-1 bg-blue-600 text-white rounded text-sm">Sign In</button>
            </SignInButton>
          </SignedOut>
        </div>

        <div className="flex-1 p-10 bg-white m-6 rounded shadow overflow-auto">
          <SignedIn><Editor /></SignedIn>
          <SignedOut>
            <p className="text-gray-400 text-center mt-20">Please sign in to edit documents.</p>
          </SignedOut>
        </div>
      </div>

    </div>
  )
}

export default App