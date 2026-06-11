import { useState, useEffect, useRef } from 'react'

/**
 * ExportMenu — drop-in export button for the TipTap editor.
 *
 * Props:
 *   editor   — TipTap editor instance
 *   title    — document title string (used as filename)
 *
 * Dependencies to install:
 *   npm install html2pdf.js  docx  turndown
 *
 * Usage in Editor.jsx:
 *   import ExportMenu from './ExportMenu'
 *   // Inside the toolbar, after the save status span:
 *   <ExportMenu editor={editor} title={title} />
 */

export default function ExportMenu({ editor, title }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(null) // track which export is in progress
  const menuRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filename = (title?.trim() || 'Untitled').replace(/[<>:"/\\|?*]/g, '-')

  // ── Helpers ──────────────────────────────────────────────────────────────

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export: PDF ──────────────────────────────────────────────────────────

  async function exportPDF() {
    setLoading('pdf')
    setOpen(false)
    try {
      const { default: html2pdf } = await import('html2pdf.js')

      // Build a clean printable container
      const container = document.createElement('div')
      container.style.cssText = [
        'font-family: Georgia, serif',
        'font-size: 12pt',
        'line-height: 1.6',
        'color: #111',
        'background: #fff',
        'padding: 0',
        'max-width: 100%',
      ].join(';')

      // Title
      const titleEl = document.createElement('h1')
      titleEl.textContent = title || 'Untitled'
      titleEl.style.cssText = 'font-size:20pt;margin:0 0 16pt 0;font-family:Arial,sans-serif'
      container.appendChild(titleEl)

      // Content
      const content = document.createElement('div')
      content.innerHTML = editor.getHTML()
      container.appendChild(content)

      await html2pdf()
        .set({
          margin: [15, 15, 15, 15], // mm
          filename: `${filename}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(container)
        .save()
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export failed. Make sure html2pdf.js is installed:\nnpm install html2pdf.js')
    }
    setLoading(null)
  }

  // ── Export: DOCX ─────────────────────────────────────────────────────────

  async function exportDocx() {
    setLoading('docx')
    setOpen(false)
    try {
      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel,
        AlignmentType, LevelFormat,
      } = await import('docx')

      // Parse the TipTap HTML into docx paragraphs
      const html = editor.getHTML()
      const parser = new DOMParser()
      const dom = parser.parseFromString(html, 'text/html')

      const paragraphs = []

      // Add the document title as H1
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: title || 'Untitled', bold: true, size: 40 })],
          spacing: { after: 240 },
        })
      )

      function nodeToRuns(node) {
        const runs = []
        node.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            if (child.textContent) {
              runs.push(new TextRun({ text: child.textContent }))
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = child.tagName.toLowerCase()
            const childRuns = nodeToRuns(child)
            const style = child.getAttribute('style') || ''
            const color = style.match(/color:\s*([^;]+)/)?.[1]?.replace('#', '') || undefined
            const highlight = style.match(/background-color:\s*([^;]+)/)?.[1] || undefined

            childRuns.forEach(run => {
              const props = {
                text: run.options?.text ?? run.text ?? '',
                bold: run.options?.bold || ['b', 'strong'].includes(tag) || undefined,
                italics: run.options?.italics || ['i', 'em'].includes(tag) || undefined,
                underline: run.options?.underline || tag === 'u' ? {} : undefined,
                color: run.options?.color || color,
                // highlight colors not supported in all docx viewers, skip for compat
              }
              // Clean up undefined
              Object.keys(props).forEach(k => props[k] === undefined && delete props[k])
              runs.push(new TextRun(props))
            })
            if (!childRuns.length && child.textContent) {
              const props = {
                text: child.textContent,
                bold: ['b', 'strong'].includes(tag) || undefined,
                italics: ['i', 'em'].includes(tag) || undefined,
                underline: tag === 'u' ? {} : undefined,
                color,
              }
              Object.keys(props).forEach(k => props[k] === undefined && delete props[k])
              runs.push(new TextRun(props))
            }
          }
        })
        return runs
      }

      function getAlignment(el) {
        const style = el.getAttribute('style') || ''
        const match = style.match(/text-align:\s*(\w+)/)
        if (!match) return AlignmentType.LEFT
        return {
          left: AlignmentType.LEFT,
          center: AlignmentType.CENTER,
          right: AlignmentType.RIGHT,
          justify: AlignmentType.JUSTIFIED,
        }[match[1]] || AlignmentType.LEFT
      }

      function processNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return
        const tag = node.tagName.toLowerCase()

        if (['h1', 'h2', 'h3'].includes(tag)) {
          const level = { h1: HeadingLevel.HEADING_2, h2: HeadingLevel.HEADING_3, h3: HeadingLevel.HEADING_4 }[tag]
          paragraphs.push(new Paragraph({
            heading: level,
            children: [new TextRun({ text: node.textContent, bold: true })],
            alignment: getAlignment(node),
            spacing: { before: 160, after: 80 },
          }))
        } else if (tag === 'p') {
          const runs = nodeToRuns(node)
          paragraphs.push(new Paragraph({
            children: runs.length ? runs : [new TextRun('')],
            alignment: getAlignment(node),
            spacing: { after: 120 },
          }))
        } else if (tag === 'ul') {
          node.querySelectorAll('li').forEach(li => {
            paragraphs.push(new Paragraph({
              numbering: { reference: 'bullets', level: 0 },
              children: [new TextRun(li.textContent)],
              spacing: { after: 60 },
            }))
          })
        } else if (tag === 'ol') {
          node.querySelectorAll('li').forEach(li => {
            paragraphs.push(new Paragraph({
              numbering: { reference: 'numbers', level: 0 },
              children: [new TextRun(li.textContent)],
              spacing: { after: 60 },
            }))
          })
        } else if (tag === 'blockquote') {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: node.textContent, italics: true, color: '555555' })],
            indent: { left: 720 },
            spacing: { after: 120 },
          }))
        } else {
          node.childNodes.forEach(child => processNode(child))
        }
      }

      dom.body.childNodes.forEach(node => processNode(node))

      const doc = new Document({
        numbering: {
          config: [
            {
              reference: 'bullets',
              levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
            },
            {
              reference: 'numbers',
              levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
            },
          ],
        },
        sections: [{
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: paragraphs,
        }],
      })

      const buffer = await Packer.toBlob(doc)
      downloadBlob(buffer, `${filename}.docx`)
    } catch (err) {
      console.error('DOCX export failed:', err)
      alert('DOCX export failed. Make sure docx is installed:\nnpm install docx')
    }
    setLoading(null)
  }

  // ── Export: Plain text ───────────────────────────────────────────────────

  function exportText() {
    setOpen(false)
    const text = editor.getText()
    const full = title ? `${title}\n${'='.repeat(title.length)}\n\n${text}` : text
    downloadBlob(new Blob([full], { type: 'text/plain;charset=utf-8' }), `${filename}.txt`)
  }

  // ── Export: Markdown ─────────────────────────────────────────────────────

  async function exportMarkdown() {
    setLoading('md')
    setOpen(false)
    try {
      const { default: TurndownService } = await import('turndown')
      const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })
      const md = td.turndown(editor.getHTML())
      const full = title ? `# ${title}\n\n${md}` : md
      downloadBlob(new Blob([full], { type: 'text/markdown;charset=utf-8' }), `${filename}.md`)
    } catch (err) {
      console.error('Markdown export failed:', err)
      alert('Markdown export failed. Make sure turndown is installed:\nnpm install turndown')
    }
    setLoading(null)
  }

  // ── Print ────────────────────────────────────────────────────────────────

  function printDoc() {
    setOpen(false)
    const html = editor.getHTML()
    const win = window.open('', '_blank', 'width=800,height=600')
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title || 'Untitled'}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6;
           color: #111; margin: 0; padding: 40px 60px; max-width: 800px; }
    h1 { font-size: 20pt; margin-bottom: 4pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    p  { margin: 0 0 8pt 0; }
    ul, ol { margin: 0 0 8pt 1.5em; padding: 0; }
    blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 16px;
                 color: #555; font-style: italic; }
    @media print {
      body { padding: 0; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>${title || 'Untitled'}</h1>
  ${html}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close() }<\/script>
</body>
</html>`)
    win.document.close()
  }

  // ── Styles ───────────────────────────────────────────────────────────────

  const menuItems = [
    { key: 'pdf',  label: '📄 Export as PDF',        action: exportPDF },
    { key: 'docx', label: '📝 Export as .docx',       action: exportDocx },
    { key: 'txt',  label: '🔤 Export as plain text',  action: exportText },
    { key: 'md',   label: '⬇️  Export as Markdown',   action: exportMarkdown },
    { key: 'print',label: '🖨️  Print',                action: printDoc },
  ]

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Export / Print"
        style={{
          padding: '2px 10px',
          borderRadius: 6,
          border: '1px solid var(--border-btn)',
          fontSize: 13,
          cursor: 'pointer',
          background: open ? 'var(--bg-btn-active)' : 'var(--bg-btn)',
          color: open ? 'var(--text-btn-active)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          height: 28,
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '⏳' : '⬆️'} Export
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            minWidth: 210,
            overflow: 'hidden',
          }}
        >
          {menuItems.map((item, i) => (
            <button
              key={item.key}
              onClick={item.action}
              disabled={loading === item.key}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 14px',
                fontSize: 13,
                border: 'none',
                borderTop: i === 4 ? '1px solid var(--border)' : 'none', // separator before Print
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                opacity: loading && loading !== item.key ? 0.5 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-toolbar)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {loading === item.key ? '⏳ Exporting…' : item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}