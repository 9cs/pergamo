"use client"

import { useState } from "react"

interface QuestionImageProps {
  src: string
  alt: string
}

export function QuestionImage({ src, alt }: QuestionImageProps) {
  const [isError, setIsError] = useState(false)

  const handleError = () => {
    console.error(`Erro ao carregar imagem: ${src}`)
    setIsError(true)
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center bg-gray-100 dark:bg-gray-800 rounded-md w-full h-64">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Imagem não disponível</p>
      </div>
    )
  }

  if (src.startsWith("http")) {
    return (
      <div className="my-4 flex justify-center">
        <img src={src || "/placeholder.svg"} alt={alt} className="max-w-full h-auto rounded-md" onError={handleError} />
      </div>
    )
  }

  return (
    <div className="my-4 flex justify-center">
      <img src={src || "/placeholder.svg"} alt={alt} className="max-w-full h-auto rounded-md" onError={handleError} />
    </div>
  )
}
