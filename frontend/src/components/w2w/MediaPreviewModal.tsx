import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DownloadSimple, FileText, Image as ImageIcon, MusicNotes, Video as VideoIcon } from '@phosphor-icons/react'

export interface MediaPreviewItem {
  fileName: string
  mimeType: string
  blobUrl: string
  size: number
}

interface MediaPreviewModalProps {
  item: MediaPreviewItem | null
  onClose: () => void
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  item,
  onClose,
}) => {
  const [textContent, setTextContent] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    if (
      item &&
      (item.mimeType.startsWith('text/') ||
        item.fileName.match(/\.(txt|json|js|ts|tsx|jsx|html|css|md|py|java|sql|log|xml|csv)$/i))
    ) {
      fetch(item.blobUrl)
        .then((res) => res.text())
        .then((txt) => {
          if (active) setTextContent(txt.slice(0, 50000))
        })
        .catch(() => {
          if (active) setTextContent('Unable to preview text content.')
        })
    }
    return () => {
      active = false
    }
  }, [item])

  if (!item) return null

  const isImage = item.mimeType.startsWith('image/')
  const isVideo = item.mimeType.startsWith('video/')
  const isAudio = item.mimeType.startsWith('audio/')
  const isPdf = item.mimeType.includes('pdf') || item.fileName.endsWith('.pdf')
  const isText = textContent !== null

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border border-[#1c1c1c] bg-[#141414] text-white p-6 rounded-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pr-6 mb-2">
          <div className="flex items-center gap-2">
            {isImage && <ImageIcon className="w-5 h-5 text-[#7089ba]" />}
            {isVideo && <VideoIcon className="w-5 h-5 text-[#7089ba]" />}
            {isAudio && <MusicNotes className="w-5 h-5 text-[#7089ba]" />}
            {isPdf && <FileText className="w-5 h-5 text-[#7089ba]" />}
            {isText && !isPdf && <FileText className="w-5 h-5 text-[#7089ba]" />}
            <DialogTitle className="text-base font-semibold truncate max-w-md">
              {item.fileName}
            </DialogTitle>
          </div>
          <a
            href={item.blobUrl}
            download={item.fileName}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
          >
            <DownloadSimple className="w-3.5 h-3.5" />
            <span>Save</span>
          </a>
        </DialogHeader>

        {/* Media Viewport */}
        <div className="w-full max-h-[60vh] overflow-auto rounded-xl bg-[#000000] border border-[#1c1c1c] p-4 flex items-center justify-center">
          {isImage && (
            <img
              src={item.blobUrl}
              alt={item.fileName}
              className="max-h-[50vh] object-contain rounded"
            />
          )}

          {isVideo && (
            <video
              src={item.blobUrl}
              controls
              autoPlay
              className="w-full max-h-[50vh] rounded"
            />
          )}

          {isAudio && (
            <div className="w-full py-8 px-4 flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-[#282828] flex items-center justify-center text-[#7089ba]">
                <MusicNotes className="w-8 h-8" />
              </div>
              <audio src={item.blobUrl} controls className="w-full max-w-md" />
            </div>
          )}

          {isPdf && (
            <iframe
              src={item.blobUrl}
              title={item.fileName}
              className="w-full h-[50vh] rounded border border-[#1c1c1c]"
            />
          )}

          {isText && !isPdf && (
            <pre className="w-full font-mono text-xs text-[#ababab] p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {textContent}
            </pre>
          )}

          {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <div className="text-center py-12 space-y-3">
              <FileText className="w-12 h-12 text-[#4d4d4d] mx-auto" />
              <p className="text-sm text-[#808080]">
                Binary file format. Preview not available.
              </p>
              <a
                href={item.blobUrl}
                download={item.fileName}
                className="inline-block px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
