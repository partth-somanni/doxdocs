```markdown
# DOXDOCS

**A Real-Time Collaborative Rich Text Document Editor**

A modern web-based collaborative document editor that combines powerful rich text editing capabilities with seamless real-time collaboration. DOXDOCS enables multiple users to create, edit, and manage documents simultaneously through an intuitive and feature-rich interface.

---

## Contributors

- **Parth Somani** (25114066)
- **Sejal Sharma** (25114083)

**B.Tech, Computer Science and Engineering (First Year)**  
**Indian Institute of Technology Roorkee**

---

## Abstract

DOXDOCS is a web-based real-time collaborative document editor designed to provide users with an intuitive and feature-rich writing experience. The application combines the flexibility of modern rich text editors with collaborative capabilities, enabling multiple users to work on the same document simultaneously.

The project was developed using React, Express, SQLite, and Socket.IO, and deployed using Vercel and Railway.

---

## Introduction

Traditional text editors often lack collaboration features or require users to rely on large third-party platforms. DOXDOCS was developed to provide an independent, lightweight, and modern document editing solution with support for real-time collaboration, media embedding, and multiple export options.

The project demonstrates the practical application of full-stack web development concepts, including frontend development, backend APIs, database management, authentication, and deployment.

---

## Objectives

- Develop a rich text document editor with modern formatting capabilities.
- Enable real-time collaboration between multiple users.
- Provide secure user authentication.
- Support multimedia content within documents.
- Allow users to export documents in multiple formats.
- Deploy the application for public accessibility.

---

## Technology Stack

### Frontend

- React
- Vite
- Tiptap Editor
- Tailwind CSS
- Socket.IO Client
- Clerk Authentication

### Backend

- Express.js
- Socket.IO
- SQLite (`better-sqlite3`)

### Deployment

> Deployment attempts were made, but stable production deployment was unsuccessful due to recurring integration and configuration errors.

- Vercel (Frontend)
- Railway (Backend)

---

## Features

### Authentication

- Secure authentication using Clerk
- Google Sign-In support
- Email-based authentication

### Rich Text Editing

- Bold, italic, and underline formatting
- Multiple heading levels
- Text alignment controls
- Font customization
- Text colours and highlights
- Ordered and unordered lists

### Real-Time Collaboration

- Simultaneous multi-user editing
- Presence indicators showing active collaborators
- Live cursor tracking
- Automatic document saving

### Document Management

- Create documents
- Rename documents
- Delete documents
- Drag-and-drop document reordering

### User Experience

- Light theme support
- Dark theme support

### Media Support

#### Images

- Local image insertion
- Base64 image support
- Server-hosted images
- External image URLs
- Image resizing

#### Videos and Media Embeds

- YouTube embeds
- Vimeo embeds
- Spotify embeds
- Direct video URL support

### Export Options

Documents can be exported as:

- PDF
- DOCX
- Markdown (`.md`)
- HTML
- TXT

---

## Testing

The application was tested manually to verify the functionality of various modules, including:

- Authentication
- Document editing
- Collaboration features
- Media handling
- Export functionality

The deployed version was also used to ensure compatibility and proper integration between the frontend and backend components.

---

## Advantages

- User-friendly interface
- Supports simultaneous collaboration
- Multiple export formats increase flexibility
- Rich multimedia capabilities
- Secure authentication mechanisms
- Accessible through web deployment without installation

---

## Limitations

- SQLite limits scalability for very large deployments
- Manual testing was performed instead of automated testing
- Advanced conflict resolution techniques such as CRDTs were not implemented
- Folder organization and workspace management are currently unavailable
- Stable production deployment could not be achieved due to persistent deployment issues

---

## Future Scope

Potential future enhancements include:

- Version history and document recovery
- AI-assisted writing features
- Commenting and suggestion mode
- Advanced collaborative conflict resolution
- Cloud-based media storage
- Team workspaces and folder organization
- Automated testing pipelines

---

## Conclusion

DOXDOCS successfully demonstrates the development of a modern collaborative document editing platform using contemporary web technologies. The project integrates rich text editing, authentication, real-time communication, media support, and deployment into a single application.

Building this project provided valuable experience in full-stack development and highlighted both the challenges and opportunities involved in developing collaborative software systems.

---

## References

- React Documentation – https://react.dev
- Tiptap Documentation – https://tiptap.dev
- Express.js Documentation – https://expressjs.com
- Socket.IO Documentation – https://socket.io
- Clerk Documentation – https://clerk.com/docs
- Vercel Documentation – https://vercel.com/docs
- Railway Documentation – https://docs.railway.app
```
