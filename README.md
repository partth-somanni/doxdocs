# DoxDocs 📝

**A Real-Time Collaborative Rich Text Document Editor**

DoxDocs is a full-stack collaborative document editor that lets multiple users write, format, and edit documents together in real time — think Google Docs, built with React, Tiptap, Express, and Socket.IO.

> ⚠️ **Deployment Note:** We debugged the errors for half a day but deployment was unsuccessful. Kindly **clone the repository and run it locally**.

---

## ✨ Features

### 🔐 Authentication
- Secure user authentication via **Clerk**
- Google Sign-In and email-based login
- Persistent user identity across sessions
- Personalized collaborative editing using usernames

### 📂 Document Management
- Create, open, rename, and delete documents
- Auto-generated default title (`Untitled`)
- Inline title editing
- Drag-and-drop reordering of documents
- Persistent storage with automatic loading on startup

### ✍️ Rich Text Editing
- Bold, italic, underline formatting
- Heading styles (H1, H2)
- Ordered lists
- Text alignment — left, center, right, justified

### 🎨 Styling & Customization
- **43 font families** across system, sans-serif, serif, monospace, and decorative categories
- Font sizes from **12px to 48px**
- Full text colour palette (neutral, warm, cool, accent) with HEX input, native colour picker, and live preview
- Multicolour highlighting (pastel & vivid palettes) with add/edit/remove support

### 🖼️ Media Support
- **Images:** local uploads, Base64, server-hosted, and external URLs — with resizing, responsive rendering, rounded styling, drag support, and alt text
- **Video/Audio Embeds:** YouTube, Vimeo, Spotify, and direct video URLs
- Responsive, resizable, and draggable media blocks with width adjustment (10–100%)

### 🤝 Real-Time Collaboration
- Simultaneous multi-user editing with live updates
- Presence system with collaborator avatars and unique colours
- Live cursor tracking with username labels
- Join/leave session handling via Socket.IO

### 💾 Auto-Save
- Debounced auto-save after inactivity
- Real-time **"Saving..."** / **"All changes saved"** indicators

### 📊 Reading Analytics
- Real-time word and character count
- Reading time estimate (based on 200 WPM)

### 📤 Export
- Export documents as **PDF, DOCX, Markdown, HTML, and TXT**

### 🌗 Themes
- Light and Dark mode with theme switching

---

## 🛠️ Tech Stack

**Frontend**
- React (component-driven, hooks-based state management)
- Vite
- [Tiptap](https://tiptap.dev/) — extension-based rich text editor

**Backend**
- Express.js
- Socket.IO — real-time collaboration
- SQLite (via `better-sqlite3`) — persistent storage

---

## 🚀 Getting Started (Local Setup)

\`\`\`bash
# Clone the repository
git clone https://github.com/<your-username>/doxdocs.git
cd doxdocs

# Install dependencies for frontend and backend
cd client && npm install
cd ../server && npm install
\`\`\`

### Environment Variables

Create a \`.env\` file in the \`server\` directory:

\`\`\`env
PORT=5000
CLERK_SECRET_KEY=your_clerk_secret_key
\`\`\`

Create a \`.env\` file in the \`client\` directory:

\`\`\`env
VITE_API_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
\`\`\`

### Run the App

\`\`\`bash
# Start the backend
cd server && npm run dev

# Start the frontend (in a new terminal)
cd client && npm run dev
\`\`\`

---

## 👥 Contributors

- **Parth Somani** (25114066) — B.Tech CSE, First Year
- **Sejal Sharma** (25114083) — B.Tech CSE, First Year

---

## 📄 Submitted To

Hostel Council, IIT Roorkee
