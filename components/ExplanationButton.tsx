"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Question {
  title: string
  index: number
  year: number
  language: string | null
  area: string
  discipline: string
  context: string
  files: string[]
  correctAlternative: string
  alternativesIntroduction: string
  alternatives: Array<{
    letter: string
    text: string
    file: string | null
    isCorrect: boolean
  }>
  dirName?: string
}

interface ExplanationButtonProps {
  question: Question
  isAnswered: boolean
  userAnswer: string | null
}

// Cache global de explicações por questão
const explanationCache = new Map<string, string>()

export default function ExplanationButton({ question, isAnswered, userAnswer }: ExplanationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [explanation, setExplanation] = useState<string>("")
  const [showExplanation, setShowExplanation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Gerar chave única para a combinação questão + resposta do usuário
  const getCacheKey = () => {
    if (!userAnswer) return null
    return `${question.index}-${question.year}-${userAnswer}`
  }

  const handleGetExplanation = async () => {
    if (!isAnswered || !userAnswer) return

    const cacheKey = getCacheKey()
    if (!cacheKey) return

    // Verificar se já existe explicação no cache
    if (explanationCache.has(cacheKey)) {
      setExplanation(explanationCache.get(cacheKey)!)
      setIsFromCache(true)
      setShowExplanation(true)
      return
    }

    setIsLoading(true)
    setError(null)
    setExplanation("")
    setIsFromCache(false)
    setShowExplanation(true)

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, userAnswer }),
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar explicação')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Stream não disponível')
      }

      let fullExplanation = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullExplanation += parsed.content
                setExplanation(fullExplanation)
              }
            } catch (e) {
              // Ignorar linhas inválidas
            }
          }
        }
      }

      // Salvar no cache após completar
      if (fullExplanation) {
        explanationCache.set(cacheKey, fullExplanation)
      }
    } catch (err) {
      setError('Erro ao gerar explicação. Tente novamente.')
      console.error('Erro ao obter explicação:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseExplanation = () => {
    setShowExplanation(false)
    setError(null)
    // Não limpar explanation para manter no cache
  }

    const modalContent = showExplanation ? (
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
        className="flex items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleCloseExplanation}
        />

        {/* Modal - centralizado pelo flex container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl w-[90vw] max-w-[600px] max-h-[85vh] overflow-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Bot className="h-5 w-5 text-blue-400" />
              </div>
                             <div>
                 <h3 className="text-lg font-semibold text-foreground">
                   Explicação da Questão
                 </h3>
                 <p className="text-sm text-muted-foreground">
                   Questão {question.index} - {question.year}
                   {isFromCache && (
                     <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                       Cache
                     </span>
                   )}
                 </p>
               </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseExplanation}
              className="text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                                 ) : (
                   <div className="prose prose-sm max-w-none">
                     <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                       <div 
                         className="text-foreground leading-relaxed"
                         dangerouslySetInnerHTML={{ 
                           __html: explanation
                             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                             .replace(/\*(.*?)\*/g, '<em>$1</em>')
                             .replace(/\n/g, '<br>')
                         }}
                       />
                       {isLoading && <span className="animate-pulse">|</span>}
                     </div>
                   </div>
                 )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Explicação gerada por IA • Pergamo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCloseExplanation}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
        </motion.div>
    </div>
  ) : null

  return (
    <>
      <Button
        onClick={handleGetExplanation}
        disabled={!isAnswered || isLoading}
        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        {isLoading ? "Gerando..." : "Mostrar explicação"}
      </Button>

      {mounted && createPortal(
        <AnimatePresence>
          {modalContent}
        </AnimatePresence>, 
        document.body
      )}
    </>
  )
}
