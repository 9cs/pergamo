"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, X, AlertTriangle } from "lucide-react"
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
  shuffledAlternatives?: Array<{
    letter: string
    text: string
    file: string | null
    isCorrect: boolean
  }>
}

const explanationCache = new Map<string, string>()

export default function ExplanationButton({ question, isAnswered, userAnswer, shuffledAlternatives }: ExplanationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [explanation, setExplanation] = useState<string>("")
  const [showExplanation, setShowExplanation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const warningRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateTooltipPosition = () => {
    if (warningRef.current) {
      const rect = warningRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: rect.right - 225,
        y: rect.top - 92
      })
    }
  }

  const handleTooltipShow = () => {
    updateTooltipPosition()
    setShowTooltip(true)
  }

  const handleTooltipHide = () => {
    setShowTooltip(false)
  }

  const getCacheKey = () => {
    if (!userAnswer) return null
    return `${question.index}-${question.year}-${userAnswer}`
  }

  const handleGetExplanation = async () => {
    if (!isAnswered || !userAnswer) return

    const cacheKey = getCacheKey()
    if (!cacheKey) return

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
      const questionToSend = shuffledAlternatives 
        ? { ...question, alternatives: shuffledAlternatives }
        : question

      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionToSend, userAnswer }),
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
            }
          }
        }
      }

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
  }

    const modalContent = showExplanation ? (
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
        className="flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleCloseExplanation}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl w-[90vw] max-w-[600px] max-h-[85vh] overflow-auto"
        >
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
                 <div className="flex items-center gap-2">
                   <div 
                     ref={warningRef}
                     className="relative"
                     onMouseEnter={handleTooltipShow}
                     onMouseLeave={handleTooltipHide}
                   >
                     <div className="p-2 bg-amber-500/20 rounded-full cursor-help">
                       <AlertTriangle className="h-4 w-4 text-amber-400" />
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
               </div>

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
        className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isLoading ? "Gerando..." : "Mostrar explicação"}
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </Button>

                   {mounted && createPortal(
               <AnimatePresence>
                 {modalContent}
               </AnimatePresence>,
               document.body
             )}

             {mounted && createPortal(
               <AnimatePresence>
                 {showTooltip && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     transition={{ duration: 0.2, ease: "easeOut" }}
                     className="fixed z-[10000] w-64 p-3 bg-27272b/80 border border-border/70 text-white text-xs rounded-lg shadow-lg pointer-events-none"
                     style={{
                       left: `${tooltipPosition.x}px`,
                       top: `${tooltipPosition.y}px`,
                     }}
                   >
                     <div className="relative">
                       <p className="text-center">
                         Esta explicação é gerada por IA e pode não estar 100% correta. 
                         Consulte um professor em caso de dúvidas.
                       </p>
                       <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>,
               document.body
             )}
           </>
         )
       }
