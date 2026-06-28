import { RichTextEditor } from './RichTextEditor'

interface TextEvidenceEditorProps {
  content: string
  onChange: (html: string) => void
  readOnly?: boolean
}

/**
 * Editor de evidência de texto. Wrapper fino sobre o `RichTextEditor`
 * reutilizável, preservando placeholder, limite e ids próprios.
 */
export function TextEvidenceEditor({ content, onChange, readOnly = false }: TextEvidenceEditorProps) {
  return (
    <RichTextEditor
      content={content}
      onChange={onChange}
      readOnly={readOnly}
      placeholder="Descreva a evidência..."
      maxChars={20000}
      minHeight={150}
      idPrefix="text-evidence-editor"
    />
  )
}
