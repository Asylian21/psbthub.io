/**
 * Browser download helpers for PSBT exports.
 */
function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Downloads a Blob by creating a temporary object URL.
 */
export function downloadBlobFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)

  try {
    triggerDownload(objectUrl, fileName)
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 1_000)
  }
}

/**
 * Downloads a data URL payload as a file.
 */
export function downloadDataUrlFile(dataUrl: string, fileName: string): void {
  triggerDownload(dataUrl, fileName)
}
