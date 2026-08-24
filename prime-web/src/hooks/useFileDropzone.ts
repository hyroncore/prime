import { useEffect, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'

export function useFileDropzone(onFiles: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false)
  const depthRef = useRef(0)

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    const reset = () => {
      depthRef.current = 0
      setIsDragOver(false)
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    window.addEventListener('dragend', reset)
    window.addEventListener('dragleave', reset)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
      window.removeEventListener('dragend', reset)
      window.removeEventListener('dragleave', reset)
    }
  }, [])

  const carriesFiles = (e: ReactDragEvent) => Array.from(e.dataTransfer.types).includes('Files')

  const onDragEnter = (e: ReactDragEvent) => {
    e.preventDefault()
    if (!carriesFiles(e)) return
    depthRef.current += 1
    setIsDragOver(true)
  }

  const onDragOver = (e: ReactDragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeave = (e: ReactDragEvent) => {
    e.preventDefault()
    if (!carriesFiles(e)) return
    depthRef.current = Math.max(0, depthRef.current - 1)
    if (depthRef.current === 0) setIsDragOver(false)
  }

  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault()
    depthRef.current = 0
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length === 0) return
    onFiles(files)
  }

  return { isDragOver, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}