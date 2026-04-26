import { FormEvent, useState, useRef, useCallback } from "react"
import { Paperclip, Send, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface Attachment {
  id: string
  file: File
  name: string
  size: number
  type: string
  url?: string
  uploadStatus: "pending" | "uploading" | "completed" | "error"
  uploadError?: string
  objectKey?: string
}

type Props = {
  value?: string
  onChange?: (text: string) => void
  onSubmit: (hypothesis: string, attachments: Attachment[]) => Promise<void> | void
  isSubmitting?: boolean
  className?: string
  placeholder?: string
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const ALLOWED_TYPES = [
  "image/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function isAllowedType(type: string): boolean {
  return ALLOWED_TYPES.some((allowed) => type.startsWith(allowed))
}

function isImageType(type: string): boolean {
  return type.startsWith("image/")
}

export function HypothesisInput({
  value = "",
  onChange,
  onSubmit,
  isSubmitting = false,
  className,
  placeholder = "e.g. Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will...",
}: Props) {
  const [text, setText] = useState(value)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const trimmedLength = text.trim().length

  // Sync external value changes
  const handleTextChange = (newText: string) => {
    setText(newText)
    onChange?.(newText)
  }

  // Expose method to set text from parent (for sample hypothesis click)
  const setHypothesisText = useCallback((newText: string) => {
    setText(newText)
    onChange?.(newText)
  }, [onChange])

  // Make setHypothesisText available to parent via ref pattern if needed
  // For now, we'll use controlled pattern where parent manages value

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (text.trim().length < 10) return
    await onSubmit(text, attachments.filter((a) => a.uploadStatus === "completed"))
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newAttachments: Attachment[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds 25MB limit`)
        return
      }
      if (!isAllowedType(file.type)) {
        errors.push(`${file.name} is not a supported file type`)
        return
      }

      newAttachments.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadStatus: "pending",
      })
    })

    if (errors.length > 0) {
      alert(errors.join("\n"))
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments])
      // Start uploading immediately
      uploadFiles(newAttachments)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function uploadFiles(filesToUpload: Attachment[]) {
    setIsUploading(true)

    for (const attachment of filesToUpload) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id ? { ...a, uploadStatus: "uploading" } : a
        )
      )

      try {
        // 1. Get presigned URL from backend
        const presignRes = await fetch(
          `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/uploads/presign/`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: attachment.file.name,
              content_type: attachment.file.type,
              size: attachment.file.size,
            }),
          }
        )

        if (!presignRes.ok) {
          throw new Error("Failed to get upload URL")
        }

        const { upload_url, file_url, object_key } = await presignRes.json()

        // 2. Upload directly to R2
        const uploadRes = await fetch(upload_url, {
          method: "PUT",
          body: attachment.file,
          headers: {
            "Content-Type": attachment.file.type,
          },
        })

        if (!uploadRes.ok) {
          throw new Error("Upload failed")
        }

        // 3. Update attachment with success
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? { ...a, uploadStatus: "completed", url: file_url, objectKey: object_key }
              : a
          )
        )
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? { ...a, uploadStatus: "error", uploadError: "Upload failed" }
              : a
          )
        )
      }
    }

    setIsUploading(false)
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const hasAttachments = attachments.length > 0
  const allUploadsComplete = attachments.every(
    (a) => a.uploadStatus === "completed" || a.uploadStatus === "error"
  )

  return (
    <form className={cn("w-full", className)} onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {/* Attachment previews */}
        {hasAttachments && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2 pr-8"
              >
                {/* Thumbnail or icon */}
                {isImageType(attachment.type) && attachment.url ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-md">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    {attachment.type.startsWith("image/") ? (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <p className="max-w-[120px] truncate text-xs font-medium text-foreground">
                    {attachment.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(attachment.size)}
                    {attachment.uploadStatus === "uploading" && " • Uploading..."}
                    {attachment.uploadStatus === "error" && " • Failed"}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  disabled={isSubmitting}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Upload progress indicator */}
                {attachment.uploadStatus === "uploading" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                    <div className="h-full w-1/2 animate-pulse bg-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <textarea
          rows={5}
          className="min-h-[140px] w-full resize-none border-0 bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          placeholder={placeholder}
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Paperclip / file attachment button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSubmitting}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              title="Attach files (images, PDFs, docs - max 25MB)"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </button>

            {/* Attachment count indicator */}
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {attachments.filter((a) => a.uploadStatus === "completed").length}/{attachments.length} uploaded
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={isSubmitting || trimmedLength < 10 || (isUploading && !allUploadsComplete)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
