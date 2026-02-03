import { DropArea } from './droparea'

interface InputWorkspaceProps {
  uploadedFile: File | null
  isProcessing: boolean
  feedbackMessage?: string
  onFileUpload: (file: File) => void
  onAudioSubmit: (audioBlob: Blob) => void
  onTextSubmit: (text: string) => void
  onClearFile: () => void
  onClearFeedback?: () => void
}

export function InputWorkspace({
  uploadedFile,
  isProcessing,
  feedbackMessage,
  onFileUpload,
  onAudioSubmit,
  onTextSubmit,
  onClearFile,
  onClearFeedback
}: InputWorkspaceProps) {
  return (
    <DropArea
      uploadedFile={uploadedFile}
      isProcessing={isProcessing}
      feedbackMessage={feedbackMessage}
      onFileUpload={onFileUpload}
      onAudioSubmit={onAudioSubmit}
      onTextSubmit={onTextSubmit}
      onClearFile={onClearFile}
      onClearFeedback={onClearFeedback}
    />
  )
}
