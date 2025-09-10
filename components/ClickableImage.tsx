"use client"

import { useState } from "react"
import ImageModal from "./ImageModal"

interface ClickableImageProps {
  src: string
  alt: string
  className?: string
}

export default function ClickableImage({ src, alt, className = "" }: ClickableImageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setIsModalOpen(true)}
      />
      
      <ImageModal
        src={src}
        alt={alt}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
