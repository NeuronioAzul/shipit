import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  maxChars?: number
  readOnly?: boolean
  /** Altura mínima da área editável, em pixels. */
  minHeight?: number
  /** Prefixo de `id` para os elementos (acessibilidade/testes). */
  idPrefix?: string
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
      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
    >
      <i className={icon} aria-hidden="true"></i>
    </button>
  )
}

/**
 * Editor rich-text reutilizável (TipTap) com negrito, itálico e listas.
 * Usado tanto pelas evidências de texto quanto pela descrição da atividade.
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Escreva aqui...',
  maxChars = 20000,
  readOnly = false,
  minHeight = 150,
  idPrefix = 'rich-text-editor',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      CharacterCount.configure({ limit: maxChars }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sincroniza a prop `content` no editor quando ela muda externamente
  // (ex.: abrir outra evidência/atividade).
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Foca o editor ao montar (modo edição) para que paste/digitação funcionem
  // sem precisar de clique inicial.
  useEffect(() => {
    if (editor && !readOnly) {
      editor.commands.focus('end')
    }
  }, [editor, readOnly])

  if (!editor) return null

  // Garante foco no fim do documento quando o clique acontece fora da área
  // editável real (padding/espaço vazio do wrapper).
  const handleContentMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return
    const target = e.target as HTMLElement
    if (!target.closest('.tiptap')) {
      e.preventDefault()
      editor.commands.focus('end')
    }
  }

  const charCount = editor.storage.characterCount.characters()
  const isNearLimit = charCount > maxChars * 0.9

  return (
    <div id={idPrefix} className="border border-border rounded-lg overflow-hidden bg-card">
      {!readOnly && (
        <div id={`${idPrefix}-toolbar`} className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
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
      <div
        id={`${idPrefix}-content`}
        onMouseDown={handleContentMouseDown}
        style={{ minHeight }}
        className="p-3 max-h-[400px] overflow-y-auto scrollbar-stable cursor-text"
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none
            text-foreground [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground
            [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
            [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
            [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6
            [&_.tiptap_li]:my-1 [&_.tiptap_p]:my-1 [&_.tiptap_strong]:font-bold [&_.tiptap_em]:italic"
        />
      </div>
      {!readOnly && (
        <div id={`${idPrefix}-counter`} className={`px-3 py-1.5 border-t border-border text-xs text-right ${
          isNearLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
        }`}>
          {charCount} / {maxChars}
        </div>
      )}
    </div>
  )
}
