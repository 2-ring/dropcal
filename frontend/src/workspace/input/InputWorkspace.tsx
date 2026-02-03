import { DropArea } from './DropArea'
import type { LoadingStateConfig, LoadingPhase } from '../../types/loadingState'

interface InputWorkspaceProps {
  uploadedFile: File | null
  isProcessing: boolean
  loadingConfig?: LoadingStateConfig | LoadingPhase[]
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
  loadingConfig,
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
      loadingConfig={loadingConfig}
      feedbackMessage={feedbackMessage}
      onFileUpload={onFileUpload}
      onAudioSubmit={onAudioSubmit}
      onTextSubmit={onTextSubmit}
      onClearFile={onClearFile}
      onClearFeedback={onClearFeedback}
    />
  )
}
