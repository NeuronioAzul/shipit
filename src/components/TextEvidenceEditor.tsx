import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'

const MAX_CHARS = 2000

interface TextEvidenceEditorProps {
  content: string
  onChange: (html: string) => void
  readOnly?: boolean
}

function ToolbarButton({
  active,
  onClick,
  title,
  icon,
}: {
  active: boolean
  onClick: () => void
  title: string
  icon: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <i className={icon} aria-hidden="true"></i>
    </button>
  )
}

export function TextEvidenceEditor({ content, onChange, readOnly = false }: TextEvidenceEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      CharacterCount.configure({ limit: MAX_CHARS }),
      Placeholder.configure({ placeholder: 'Descreva a evidência...' }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync content prop into editor when it changes (e.g. opening a different evidence)
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  const charCount = editor.storage.characterCount.characters()
  const isNearLimit = charCount > MAX_CHARS * 0.9

  return (
    <div id="text-evidence-editor" className="border border-border rounded-lg overflow-hidden bg-card">
      {!readOnly && (
        <div id="text-evidence-editor-toolbar" className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrito (Ctrl+B)"
            icon="fa-solid fa-bold"
          />
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Itálico (Ctrl+I)"
            icon="fa-solid fa-italic"
          />
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista com marcadores"
            icon="fa-solid fa-list-ul"
          />
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
            icon="fa-solid fa-list-ol"
          />
        </div>
      )}
      <div id="text-evidence-editor-content">
        <EditorContent
        editor={editor}
        className="cyber-input prose prose-sm max-w-none p-3 min-h-[150px] max-h-[400px] overflow-y-auto
          text-foreground [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground
          [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
          [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
          [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6
          [&_.tiptap_li]:my-1 [&_.tiptap_p]:my-1 [&_.tiptap_strong]:font-bold [&_.tiptap_em]:italic"
      />
      </div>
      {!readOnly && (
        <div id="text-evidence-editor-counter" className={`px-3 py-1.5 border-t border-border text-xs text-right ${
          isNearLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
        }`}>
          {charCount} / {MAX_CHARS}
        </div>
      )}
    </div>
  )
}
