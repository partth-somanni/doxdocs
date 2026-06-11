import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * MediaModal
 * Props:
 *   type      — 'image' | 'video'
 *   onInsert  — ({ src, alt, width }) => void   for image
 *               ({ src })            => void   for video
 *   onClose   — () => void
 */
export default function MediaModal({ type, onInsert, onClose }) {
  const [tab, setTab] = useState('url')          // 'url' | 'upload'  (images only)
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [width, setWidth] = useState('100')      // percent
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)   // data-URL for upload preview
  const [uploadFile, setUploadFile] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const firstInputRef = useRef(null)

  // Focus trap
  useEffect(() => {
    firstInputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const readFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, GIF, WebP).')
      return
    }
    setError('')
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    readFile(e.dataTransfer.files[0])
  }

  function handleInsert() {
    setError('')
    if (type === 'image') {
      const src = tab === 'upload' ? preview : url.trim()
      if (!src) { setError('Please provide an image.'); return }
      onInsert({ src, alt: alt.trim(), width: parseInt(width, 10) || 100 })
    } else {
      const src = url.trim()
      if (!src) { setError('Please enter a URL.'); return }
      onInsert({ src: normalizeVideoUrl(src) })
    }
    onClose()
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%', maxWidth: 460,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
            {type === 'image' ? '🖼  Insert Image' : '▶  Embed Video'}
          </span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tabs (images only) */}
          {type === 'image' && (
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-toolbar)', borderRadius: 8, padding: 3 }}>
              {['url', 'upload'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError('') }}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    background: tab === t ? 'var(--bg-surface)' : 'transparent',
                    color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'url' ? '🔗 From URL' : '⬆ Upload'}
                </button>
              ))}
            </div>
          )}

          {/* Upload area */}
          {type === 'image' && tab === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--text-active)' : 'var(--border-btn)'}`,
                borderRadius: 8, padding: '20px 16px',
                textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--bg-active)' : 'var(--bg-toolbar)',
                transition: 'all 0.15s',
              }}
            >
              {preview ? (
                <img src={preview} alt="preview"
                  style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                    Drag & drop or <span style={{ color: 'var(--text-active)', textDecoration: 'underline' }}>browse</span>
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>PNG, JPG, GIF, WebP</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => readFile(e.target.files[0])} />
            </div>
          )}

          {/* URL input */}
          {(type === 'video' || tab === 'url') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>
                {type === 'image' ? 'Image URL' : 'Media URL'}
              </label>
              <input
                ref={firstInputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
                placeholder={
                  type === 'image'
                    ? 'https://example.com/image.png'
                    : 'YouTube,Spotify, Vimeo, or direct MP4 URL'
                }
                style={inputStyle}
              />
              {type === 'video' && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Supports YouTube, Vimeo, Spotify tracks/playlists, and direct .mp4 links
                </p>
              )}
            </div>
          )}

          {/* URL preview */}
          {type === 'image' && tab === 'url' && url && (
            <img
              src={url} alt="preview"
              onError={(e) => e.target.style.display = 'none'}
              style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 6, objectFit: 'contain',
                       border: '1px solid var(--border)', background: 'var(--bg-toolbar)' }}
            />
          )}

          {/* Alt text (images) */}
          {type === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Alt text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input
                ref={tab === 'upload' ? firstInputRef : undefined}
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image…"
                style={inputStyle}
              />
            </div>
          )}

          {/* Width (images) */}
          {type === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Width — {width}%</label>
              <input
                type="range" min={10} max={100} step={5}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--text-active)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>10%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0, background: '#fef2f2',
                        padding: '8px 10px', borderRadius: 6, border: '1px solid #fecaca' }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleInsert} style={insertBtnStyle}>
              {type === 'image' ? 'Insert Image' : 'Embed Media'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Video URL normalizer ──────────────────────────────────────────────────

function normalizeVideoUrl(url) {
  try {
    const u = new URL(url)

    // YouTube: watch?v= → embed
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    // YouTube short: youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace(/^\//, '')
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    if (
      u.hostname.includes('open.spotify.com') &&
      u.pathname.startsWith('/track/')
    ) {
      return `https://open.spotify.com/embed${u.pathname}`
    }
    if (
      u.hostname.includes('open.spotify.com') &&
      u.pathname.startsWith('/playlist/')
    ) {
      return `https://open.spotify.com/embed${u.pathname}`
    }
    if (
      u.hostname.includes('open.spotify.com') &&
      u.pathname.startsWith('/album/')
    ) {
      return `https://open.spotify.com/embed${u.pathname}`
    }
  } catch {}
  return url // pass through (direct mp4, etc.)
}

// ── Styles ────────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em',
}

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid var(--border-btn)',
  background: 'var(--bg-btn)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const closeBtnStyle = {
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid var(--border-btn)',
  background: 'var(--bg-btn)',
  color: 'var(--text-muted)',
  cursor: 'pointer', fontSize: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const cancelBtnStyle = {
  padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border-btn)',
  background: 'var(--bg-btn)', color: 'var(--text-secondary)',
  fontSize: 13, cursor: 'pointer',
}

const insertBtnStyle = {
  padding: '7px 18px', borderRadius: 7, border: 'none',
  background: '#2563eb', color: '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}