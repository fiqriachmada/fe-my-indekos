'use client'

import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Check, X, Move } from 'lucide-react'

interface ImageCropModalProps {
  isOpen: boolean
  imageSrc: string | null
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => void
  accentColor?: string
}

export function ImageCropModal(props: ImageCropModalProps) {
  if (!props.isOpen || !props.imageSrc) return null
  return <ImageCropContent key={props.imageSrc} {...props} />
}

function ImageCropContent({
  imageSrc,
  onClose,
  onCropComplete,
  accentColor = 'bg-indigo-600 hover:bg-indigo-700',
}: ImageCropModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleCrop = useCallback(() => {
    if (!imageRef.current) return
    const img = imageRef.current
    const canvas = document.createElement('canvas')
    const size = 400 // output size 400x400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Preview area diameter adalah 240px
    const previewDiameter = 240
    const ratio = size / previewDiameter

    ctx.imageSmoothingQuality = 'high'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Hitung posisi render
    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight

    // Gambar di preview dirender dengan max(diameter)
    const baseScale = Math.max(previewDiameter / imgWidth, previewDiameter / imgHeight)
    const finalScale = baseScale * scale * ratio

    const drawW = imgWidth * finalScale
    const drawH = imgHeight * finalScale

    const centerX = size / 2 + position.x * ratio
    const centerY = size / 2 + position.y * ratio

    ctx.drawImage(img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob)
        }
      },
      'image/jpeg',
      0.92
    )
  }, [position, scale, onCropComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold">Sesuaikan Foto Profil</h3>
            <p className="text-xs text-muted-foreground">Geser dan atur ukuran foto sesuai lingkaran</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Mask */}
        <div className="relative mt-4 flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl bg-black/90 select-none">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc ?? undefined}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                maxWidth: '240px',
                maxHeight: '240px',
                objectFit: 'contain',
              }}
              className="pointer-events-none transition-transform duration-75"
            />
          </div>

          {/* Circle Overlay Grid */}
          <div className="pointer-events-none absolute h-60 w-60 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" />
          <div className="pointer-events-none absolute bottom-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur-xs">
            <Move size={12} />
            <span>Klik & geser untuk memindahkan</span>
          </div>
        </div>

        {/* Zoom Controls Slider */}
        <div className="mt-4 flex items-center gap-3 px-2">
          <ZoomOut size={16} className="text-muted-foreground shrink-0" />
          <input
            type="range"
            min={0.8}
            max={3.0}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 dark:accent-indigo-400 cursor-pointer"
          />
          <ZoomIn size={16} className="text-muted-foreground shrink-0" />
          <span className="w-12 text-right text-xs font-semibold text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition ${accentColor}`}
          >
            <Check size={14} />
            <span>Gunakan Foto</span>
          </button>
        </div>
      </div>
    </div>
  )
}
