
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const SUPPORTED_FORMAT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateImageFile(file: File): ValidationResult {
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format for "${file.name}". Supported formats are: JPEG, PNG, WEBP.`
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File "${file.name}" is ${sizeMb} MB. Maximum allowed size is 15 MB.`
    }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function processFileWithProgress(
  file: File,
  onProgress: (progress: number) => void,
  onSuccess: (dataUrl: string) => void,
  onError: (error: string) => void
): () => void {
  let isCancelled = false
  const reader = new FileReader()

  reader.onprogress = (event) => {
    if (isCancelled) return
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 90)
      onProgress(percent)
    }
  }

  reader.onload = () => {
    if (isCancelled) return
    onProgress(100)
    onSuccess(reader.result as string)
  }

  reader.onerror = () => {
    if (isCancelled) return
    onError(`Failed to read file "${file.name}".`)
  }

  reader.readAsDataURL(file)

  return () => {
    isCancelled = true
    try {
      reader.abort()
    } catch {
      // ignore
    }
  }
}
