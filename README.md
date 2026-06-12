DOXDOCS: A Real-Time Collaborative Rich Text Document Editor

Project Report
Submitted to
Hostel Council, IIT Roorkee
Submitted by
Parth Somani ( 25114066 )
Sejal Sharma  ( 25114083 )
B.Tech, Computer Science and Engineering (First Year)

Abstract
DOXDOCS is a web-based real-time collaborative document editor designed to provide users with an intuitive and feature-rich writing experience. The application combines the flexibility of modern rich text editors with collaborative capabilities, enabling multiple users to work on the same document simultaneously. The project was developed using React, Express, SQLite, and Socket.IO, and deployed using Vercel and Railway.

Introduction
Traditional text editors often lack collaboration features or require users to rely on large third-party platforms. DOXDOCS was developed to provide an independent, lightweight, and modern document editing solution with support for real-time collaboration, media embedding, and multiple export options.
The project demonstrates the practical application of full-stack web development concepts, including frontend development, backend APIs, database management, authentication, and deployment.

Objectives
To develop a rich text document editor with modern formatting capabilities.
To enable real-time collaboration between multiple users.
To provide secure user authentication.
To support multimedia content within documents.
To allow users to export documents in multiple formats.
To deploy the application for public accessibility.

Technology Stack
Frontend
React
Vite
Tiptap Editor
Tailwind CSS
Socket.IO Client
Clerk Authentication
Backend
Express.js
Socket.IO
SQLite (better-sqlite3)
Deployment ( unsuccessful, because of constant errors ) 
Vercel (Frontend)
Railway (Backend)


Key Features
Secure authentication using Clerk with Google and Email login.
Rich text editing with support for:
Bold, italic, underline
Headings
Text alignment
Font customization
Text colours and highlights
Lists
Real-time collaborative editing.
Presence indicators showing active collaborators.
Live cursor tracking.
Automatic document saving.
Document creation, renaming, deletion, and drag-and-drop reordering.
Light and dark theme support.
Image insertion and resizing.
Support for local, Base64, server-hosted, and external images.
Video embedding from:
YouTube
Vimeo
Spotify
Direct video URLs
Export options:
PDF
DOCX
Markdown
HTML
TXT

Testing
The application was tested manually to verify the functionality of various modules, including authentication, document editing, collaboration features, media handling, and export options. The deployed version was used to ensure compatibility and proper integration between the frontend and backend.

Advantages
User-friendly interface.
Supports simultaneous collaboration.
Multiple export formats increase flexibility.
Rich multimedia capabilities.
Secure authentication mechanisms.
Accessible through web deployment without installation.

Limitations
SQLite limits scalability for very large deployments.
Manual testing was performed instead of automated testing.
Advanced conflict resolution techniques such as CRDTs were not implemented.
Folder organization and workspace management are currently unavailable.

Future Scope
Future enhancements may include:
Version history and document recovery.
AI-assisted writing features.
Commenting and suggestion mode.
Advanced collaborative conflict resolution.
Cloud-based media storage.
Team workspaces and folder organization.

Conclusion
DOXDOCS successfully demonstrates the development of a modern collaborative document editing platform using contemporary web technologies. The project integrates rich text editing, authentication, real-time communication, media support, and deployment into a single application. It provided valuable experience in full-stack development and highlighted the challenges and opportunities involved in building collaborative software systems.

References
React Documentation – https://react.dev
Tiptap Documentation – https://tiptap.dev
Express.js Documentation – https://expressjs.com
Socket.IO Documentation – https://socket.io
Clerk Documentation – https://clerk.com/docs
Vercel Documentation – https://vercel.com/docs
Railway Documentation – https://docs.railway.app

