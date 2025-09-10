"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface ImageModalProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  // Controlar se o componente está montado (para SSR)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setLastPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  // Fechar com ESC e zoom com wheel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    const handleWheel = (e: WheelEvent) => {
      if (isOpen) {
        e.preventDefault()
        e.stopPropagation()
        
        // Calcular delta baseado na direção do scroll
        const delta = e.deltaY > 0 ? -0.2 : 0.2
        const newScale = Math.max(0.5, Math.min(3, scale + delta))
        
        setScale(newScale)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.addEventListener("wheel", handleWheel, { passive: false })
      // Prevenir scroll do body
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("wheel", handleWheel)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose, scale])



  // Drag para mover a imagem
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      // Reduzir sensibilidade do arrastar
      const sensitivity = 0.7
      const newX = (e.clientX - dragStart.x) * sensitivity
      const newY = (e.clientY - dragStart.y) * sensitivity
      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      setLastPosition({ x: position.x, y: position.y })
    }
  }

  // Touch events para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && scale > 1) {
      e.preventDefault()
      const touch = e.touches[0]
      // Reduzir sensibilidade do arrastar no touch também
      const sensitivity = 0.7
      const newX = (touch.clientX - dragStart.x) * sensitivity
      const newY = (touch.clientY - dragStart.y) * sensitivity
      setPosition({ x: newX, y: newY })
    }
  }

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false)
      setLastPosition({ x: position.x, y: position.y })
    }
  }

  // Pinch to zoom para mobile
  const handleTouchStartPinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
    }
  }

  const handleTouchMovePinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      // Calcular zoom baseado na distância entre os dedos
      const initialDistance = 100 // Distância inicial de referência
      const newScale = Math.max(0.5, Math.min(3, distance / initialDistance))
      setScale(newScale)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999
        }}
        onClick={(e) => {
          // Fecha quando clicar no fundo (não na imagem ou botões)
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        {/* Botão de fechar */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className="h-6 w-6" />
        </Button>


        {/* Imagem */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative max-w-[90vw] max-h-[90vh] cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            transformOrigin: "center center",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            handleTouchStart(e)
            handleTouchStartPinch(e)
          }}
          onTouchMove={(e) => {
            handleTouchMove(e)
            handleTouchMovePinch(e)
          }}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: "center center",
              transition: scale === 1 ? "transform 0.1s ease-out" : "none"
            }}
          />
        </motion.div>

        {/* Instruções */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-center">
          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
            <p className="hidden sm:block text-white font-medium">
              Use a roda do mouse para zoom • Arraste para mover • Clique fora para fechar
            </p>
            <p className="sm:hidden text-white font-medium">
              Toque com dois dedos para zoom • Arraste para mover • Toque fora para fechar
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
