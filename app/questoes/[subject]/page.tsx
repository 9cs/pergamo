"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import ExplanationButton from "@/components/ExplanationButton"
import ClickableImage from "@/components/ClickableImage"
import {
  Home,
  ArrowRight,
  CheckCircle,
  XCircle,
  BookOpen,
  Info,
  SkipForward,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  RotateCcw,
  ArrowLeft,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

// Tipos
interface Alternative {
  letter: string
  text: string
  file: string | null
  isCorrect: boolean
}

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
  alternatives: Alternative[]
  explanation?: string
  dirName?: string
}

// Função parse markdown simples
function parseMarkdown(text: string | undefined | null) {
  if (!text) return null
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g)
  return boldParts.flatMap((part, i) => {
    if (part.match(/^\*\*[^*]+\*\*$/)) {
      const inner = part.slice(2, -2)
      return <strong key={`b${i}`}>{parseMarkdown(inner)}</strong>
    }
    const italicParts = part.split(/(_[^_]+_)/g)
    return italicParts.map((sub, j) => {
      if (sub.match(/^_[^_]+_$/)) {
        return <em key={`i${i}-${j}`}>{sub.slice(1, -1)}</em>
      }
      return sub
    })
  })
}

// SafeImage com fallback e clique para ampliar
function SafeImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)
  if (error) {
    return <img src="/placeholder.svg" alt="Imagem não encontrada" className="max-w-full h-auto rounded-md" />
  }
  return (
    <ClickableImage
      src={src || "/placeholder.svg"}
      alt={alt}
      className="max-w-full h-auto rounded-md"
    />
  )
}

// Função para extrair nome do arquivo de uma URL
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split('/').pop()
    return fileName || ''
  } catch {
    // Se não for uma URL válida, retornar o próprio texto
    return url.split('/').pop() || url
  }
}

// Formatar contexto + imagens inline
function formatContext(context: string | undefined | null, files: string[], dirName?: string, year?: number) {
  if (!context) return null
  
  // Detectar imagens em formato markdown ![](URL)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const parts = []
  let lastIndex = 0
  let match
  
  while ((match = imageRegex.exec(context)) !== null) {
    // Adicionar texto antes da imagem
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: context.slice(lastIndex, match.index)
      })
    }
    
    // Adicionar a imagem
    const imageUrl = match[2]
    const fileName = extractFileNameFromUrl(imageUrl)
    parts.push({
      type: 'image',
      fileName: fileName,
      alt: match[1] || 'Imagem da questão'
    })
    
    lastIndex = match.index + match[0].length
  }
  
  // Adicionar texto restante
  if (lastIndex < context.length) {
    parts.push({
      type: 'text',
      content: context.slice(lastIndex)
    })
  }
  
  // Se não encontrou imagens markdown, usar o método antigo com [imagem]
  if (parts.length === 0) {
    const oldParts = context.split("[imagem]")
    let fileIndex = 0
    const basePath = year && dirName ? `/year/${year}/questions/${dirName}` : ""

    return (
      <div className="context-block whitespace-pre-line">
        {oldParts.map((part, i) => (
          <div key={i} className="mb-4">
            {parseMarkdown(part)}
            {i < oldParts.length - 1 && files[fileIndex] && (
              <div className="my-4 flex justify-center">
                <SafeImage src={`${basePath}/${files[fileIndex++]}`} alt={`Imagem da questão`} />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }
  
  // Processar as partes encontradas
  const basePath = year && dirName ? `/year/${year}/questions/${dirName}` : ""
  
  return (
    <div className="context-block whitespace-pre-line">
      {parts.map((part, i) => (
        <div key={i} className="mb-4">
          {part.type === 'text' ? (
            parseMarkdown(part.content)
          ) : (
            <div className="my-4 flex justify-center">
              <SafeImage 
                src={`${basePath}/${part.fileName}`} 
                alt={part.alt || 'Imagem da questão'} 
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Escolher próxima não respondida
// Helper: retornar próximo índice sequencial (current + 1) ou null se acabar
function getNextIndexSequential(total: number, currentIdx: number | null): number | null {
  if (currentIdx === null) return total > 0 ? 0 : null
  const next = currentIdx + 1
  return next < total ? next : null
}

export default function QuestionsPage() {
  const router = useRouter()
  const params = useParams()
  const subject = params?.subject as string
  
  // Capturar parâmetro da língua da URL
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)


  // estados principais (sempre no topo)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [stats, setStats] = useState({ total: 0, correct: 0, incorrect: 0 })
  const [showStats, setShowStats] = useState(false)
  const [direction, setDirection] = useState(0)
  const [subjectName, setSubjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  // total time across the session
  const [totalTime, setTotalTime] = useState(0)
  // per-question timer
  const [questionTime, setQuestionTime] = useState(0)
  // ref para manter id do timer total (iniciado quando as questões são carregadas)
  const totalTimerId = useRef<number | null>(null)
  // Cache de questões no lado do cliente
  const questionsCache = useRef<Map<string, Question[]>>(new Map())
  
  // Estados para embaralhamento de alternativas
  const [shuffledAlternatives, setShuffledAlternatives] = useState<Alternative[]>([])
  const [alternativeMapping, setAlternativeMapping] = useState<Map<string, string>>(new Map())
  
  // Função para embaralhar alternativas mantendo a ordem das letras A, B, C, D, E
  const shuffleAlternatives = (alternatives: Alternative[]) => {
    // Verificar se alternatives existe e é um array
    if (!alternatives || !Array.isArray(alternatives)) {
      return { shuffled: [], mapping: new Map() }
    }
    
    // Criar uma cópia das alternativas
    const shuffled = [...alternatives]
    
    // Embaralhar apenas o conteúdo, mantendo as letras na ordem A, B, C, D, E
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    // Reatribuir as letras na ordem correta A, B, C, D, E
    const letters = ['A', 'B', 'C', 'D', 'E']
    const reordered = shuffled.map((alt, index) => ({
      ...alt,
      letter: letters[index]
    }))
    
    // Criar mapeamento: letra original -> letra na posição embaralhada
    const mapping = new Map<string, string>()
    alternatives.forEach((original, index) => {
      const shuffledIndex = shuffled.findIndex(alt => alt.letter === original.letter)
      const newLetter = letters[shuffledIndex]
      mapping.set(original.letter, newLetter)
    })
    
    return { shuffled: reordered, mapping }
  }
  
  // Estados para carregamento progressivo
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0) // Total real de questões
  const [loadedQuestionsCount, setLoadedQuestionsCount] = useState(0) // Quantas já foram carregadas
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [allQuestionsLoaded, setAllQuestionsLoaded] = useState(false)



  // Capturar parâmetro da língua da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const lang = urlParams.get('lang')
    setSelectedLanguage(lang)
  }, [])

  // per-question timer resets on question change
  useEffect(() => {
    setQuestionTime(0)
    const q = setInterval(() => setQuestionTime((s) => s + 1), 1000)
    return () => clearInterval(q)
  }, [currentQuestionIndex])
  
  // Embaralhar alternativas quando a questão mudar
  useEffect(() => {
    if (currentQuestionIndex !== null && questions[currentQuestionIndex]) {
      const currentQuestion = questions[currentQuestionIndex]
      if (currentQuestion && currentQuestion.alternatives) {
        const { shuffled, mapping } = shuffleAlternatives(currentQuestion.alternatives)
        setShuffledAlternatives(shuffled)
        setAlternativeMapping(mapping)
      }
    }
  }, [currentQuestionIndex, questions])
  // garantimos limpar o timer total ao desmontar
  useEffect(() => {
    return () => {
      if (totalTimerId.current) {
        clearInterval(totalTimerId.current)
        totalTimerId.current = null
      }
    }
  }, [])

  // quando mostramos stats, parar o timer total
  useEffect(() => {
    if (showStats && totalTimerId.current) {
      clearInterval(totalTimerId.current)
      totalTimerId.current = null
    }
  }, [showStats])

  // Map para traduzir matérias
  const getSubjectName = (id: string) => {
    const subjectMap: { [key: string]: string } = {
      "ciencias-humanas": "Ciências Humanas",
      "ciencias-natureza": "Ciências da Natureza",
      linguagens: "Linguagens",
      matematica: "Matemática",
      filosofia: "Filosofia",
      sociologia: "Sociologia",
      historia: "História",
      geografia: "Geografia",
      biologia: "Biologia",
      fisica: "Física",
      quimica: "Química",
      portugues: "Português",
      literatura: "Literatura",
      ingles: "Inglês",
      espanhol: "Espanhol",
    }
    return subjectMap[id] || id.charAt(0).toUpperCase() + id.slice(1)
  }

  // Carregar questões
  useEffect(() => {
    // Para linguagens, só carregar quando tiver a língua selecionada
    if (subject === "linguagens") {
      if (selectedLanguage && !hasLoadedRef.current) {
        loadQuestions(subject)
        hasLoadedRef.current = true
      }
    } else {
      // Para outros subjects, carregar imediatamente se não foi carregado
      if (!hasLoadedRef.current) {
        loadQuestions(subject)
        hasLoadedRef.current = true
      }
    }
  }, [subject, selectedLanguage])

  const loadQuestions = async (subjectToLoad: string, offset = 0, limit = 20) => {
    try {
      if (offset === 0) {
        setLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log("Carregando questões para subject:", subjectToLoad, "offset:", offset, "limit:", limit)
      }
      
      // Verificar cache primeiro
      const cacheKey = subjectToLoad === "linguagens" && selectedLanguage 
        ? `linguagens-${selectedLanguage}` 
        : subjectToLoad
      
      if (questionsCache.current.has(cacheKey) && offset === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Usando cache para:", cacheKey)
        }
        const cachedData = questionsCache.current.get(cacheKey)!
        setQuestions(cachedData)
        setTotalQuestionsCount(cachedData.length)
        setLoadedQuestionsCount(cachedData.length)
        setAllQuestionsLoaded(true)
        setCurrentQuestionIndex(cachedData.length > 0 ? 0 : null)
        setLoading(false)
        return
      }
      
      let allData: Question[] = []
      let totalCount = 0
      
      // Carregamento progressivo com paginação
      if (subjectToLoad === "linguagens" && selectedLanguage) {
        // Para linguagens, carregar todas as questões de uma vez (sem paginação)
        // pois a paginação individual por disciplina causa problemas
        const response = await fetch('/api/questions/batch-progressive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=3600',
          },
          body: JSON.stringify({
            subjects: [selectedLanguage, 'portugues', 'literatura', 'artes'],
            offset: 0, // Sempre carregar do início
            limit: 10000 // Número grande para carregar todas
          })
        })
        
        if (!response.ok) throw new Error(`Erro ao carregar questões: ${response.status}`)
        const batchData = await response.json()
        
        const languageData = batchData[selectedLanguage]?.questions || []
        const portuguesData = batchData.portugues?.questions || []
        const literaturaData = batchData.literatura?.questions || []
        const artesData = batchData.artes?.questions || []
        
        // Somar o total de todas as disciplinas de linguagens
        totalCount = (batchData[selectedLanguage]?.total || 0) + 
                    (batchData.portugues?.total || 0) + 
                    (batchData.literatura?.total || 0) + 
                    (batchData.artes?.total || 0)
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Questões de", selectedLanguage, ":", languageData.length, "questões")
          console.log("Questões de português:", portuguesData.length, "questões")
          console.log("Questões de literatura:", literaturaData.length, "questões")
          console.log("Questões de artes:", artesData.length, "questões")
          console.log("Total de questões:", totalCount)
        }
        
        // Criar distribuição melhorada: duplicar questões de língua estrangeira para aparecerem mais
        const languageDataDuplicated = [...languageData, ...languageData] // Duplicar para aparecer 2x mais
        
        // Combinar todas as questões
        const allCombined = [...languageDataDuplicated, ...portuguesData, ...literaturaData, ...artesData]
        
        // Embaralhar todas as questões
        const shuffled = allCombined.sort(() => Math.random() - 0.5)
        
        // Aplicar paginação manual aqui
        allData = shuffled.slice(offset, offset + limit)
        setSubjectName(`Linguagens (${getSubjectName(selectedLanguage)})`)
      } else if (subjectToLoad === "ciencias-humanas") {
        const response = await fetch('/api/questions/batch-progressive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=3600',
          },
          body: JSON.stringify({
            subjects: ['historia', 'geografia', 'filosofia', 'sociologia'],
            offset,
            limit
          })
        })
        
        if (!response.ok) throw new Error(`Erro ao carregar questões: ${response.status}`)
        const batchData = await response.json()
        
        const historiaData = batchData.historia?.questions || []
        const geografiaData = batchData.geografia?.questions || []
        const filosofiaData = batchData.filosofia?.questions || []
        const sociologiaData = batchData.sociologia?.questions || []
        
        // Somar o total de todas as disciplinas de ciências humanas
        totalCount = (batchData.historia?.total || 0) + 
                    (batchData.geografia?.total || 0) + 
                    (batchData.filosofia?.total || 0) + 
                    (batchData.sociologia?.total || 0)
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Questões de história:", historiaData.length, "questões")
          console.log("Questões de geografia:", geografiaData.length, "questões")
          console.log("Questões de filosofia:", filosofiaData.length, "questões")
          console.log("Questões de sociologia:", sociologiaData.length, "questões")
          console.log("Total de questões:", totalCount)
        }
        
        allData = [...historiaData, ...geografiaData, ...filosofiaData, ...sociologiaData]
        setSubjectName("Ciências Humanas")
      } else if (subjectToLoad === "ciencias-natureza") {
        const response = await fetch('/api/questions/batch-progressive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=3600',
          },
          body: JSON.stringify({
            subjects: ['biologia', 'quimica', 'fisica'],
            offset,
            limit
          })
        })
        
        if (!response.ok) throw new Error(`Erro ao carregar questões: ${response.status}`)
        const batchData = await response.json()
        
        const biologiaData = batchData.biologia?.questions || []
        const quimicaData = batchData.quimica?.questions || []
        const fisicaData = batchData.fisica?.questions || []
        
        // Somar o total de todas as disciplinas de ciências da natureza
        totalCount = (batchData.biologia?.total || 0) + 
                    (batchData.quimica?.total || 0) + 
                    (batchData.fisica?.total || 0)
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Questões de biologia:", biologiaData.length, "questões")
          console.log("Questões de química:", quimicaData.length, "questões")
          console.log("Questões de física:", fisicaData.length, "questões")
          console.log("Total de questões:", totalCount)
        }
        
        allData = [...biologiaData, ...quimicaData, ...fisicaData]
        setSubjectName("Ciências da Natureza")
      } else {
        // Para outros subjects, usar API progressiva também
        const response = await fetch('/api/questions/batch-progressive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=3600',
          },
          body: JSON.stringify({
            subjects: [subjectToLoad],
            offset,
            limit
          })
        })
        
        if (!response.ok) throw new Error(`Erro ao carregar questões de ${subjectToLoad}: ${response.status}`)
        const batchData = await response.json()
        
        allData = batchData[subjectToLoad]?.questions || []
        totalCount = batchData[subjectToLoad]?.total || 0
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Questões de", subjectToLoad, ":", allData.length, "questões")
          console.log("Total de questões:", totalCount)
        }
        
        setSubjectName(getSubjectName(subjectToLoad))
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Questões carregadas neste lote:", allData.length, "questões")
        console.log("Total de questões disponíveis:", totalCount)
      }
      
      // Embaralhar apenas o lote atual
      const shuffled = allData.sort(() => Math.random() - 0.5)
      
      if (offset === 0) {
        // Primeiro carregamento
        setQuestions(shuffled)
        setTotalQuestionsCount(totalCount)
        setLoadedQuestionsCount(shuffled.length)
        setAllQuestionsLoaded(shuffled.length >= totalCount)
        setCurrentQuestionIndex(shuffled.length > 0 ? 0 : null)
        
        // Armazenar no cache
        questionsCache.current.set(cacheKey, shuffled)
        if (process.env.NODE_ENV === 'development') {
          console.log("Questões armazenadas no cache para:", cacheKey)
        }
      } else {
        // Carregamento adicional - adicionar às questões existentes
        setQuestions(prev => [...prev, ...shuffled])
        setLoadedQuestionsCount(prev => prev + shuffled.length)
        setAllQuestionsLoaded(loadedQuestionsCount + shuffled.length >= totalCount)
      }
      // iniciar timer total a partir do momento em que as questões estiverem prontas
      if (shuffled.length > 0 && offset === 0) {
        // limpar caso já exista (segurança)
        if (totalTimerId.current) {
          clearInterval(totalTimerId.current)
        }
        totalTimerId.current = window.setInterval(() => {
          setTotalTime((prev) => prev + 1)
        }, 1000)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Erro ao carregar questões:", error)
      }
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }

  const currentQuestion = currentQuestionIndex !== null ? questions[currentQuestionIndex] : undefined

  // Função para carregar mais questões quando necessário
  const loadMoreQuestions = async () => {
    if (isLoadingMore || allQuestionsLoaded) return
    
    // Para linguagens, não precisamos de carregamento adicional pois carregamos tudo de uma vez
    if (subject === "linguagens") return
    
    const remainingQuestions = questions.length - (currentQuestionIndex || 0)
    if (remainingQuestions <= 5) { // Carregar mais quando restam 5 ou menos questões
      await loadQuestions(subject, loadedQuestionsCount, 20)
    }
  }

  // Verificar se precisa carregar mais questões
  useEffect(() => {
    if (currentQuestionIndex !== null && !allQuestionsLoaded) {
      loadMoreQuestions()
    }
  }, [currentQuestionIndex, allQuestionsLoaded, isLoadingMore])

  // Função para mapear letra embaralhada de volta para a original
  const getOriginalLetter = (shuffledLetter: string) => {
    for (const [original, shuffled] of alternativeMapping.entries()) {
      if (shuffled === shuffledLetter) {
        return original
      }
    }
    return shuffledLetter // fallback
  }
  
  // Função para encontrar a letra correta na posição embaralhada
  const getCorrectShuffledLetter = () => {
    if (!currentQuestion) return null
    for (const [original, shuffled] of alternativeMapping.entries()) {
      if (original === currentQuestion.correctAlternative) {
        return shuffled
      }
    }
    return currentQuestion.correctAlternative // fallback
  }

  // Handlers
  const handleSelectAnswer = (letter: string) => !isAnswered && setSelectedAnswer(letter)

  const handleConfirmAnswer = () => {
    if (selectedAnswer && currentQuestion) {
      setIsAnswered(true)
      // Mapear a resposta selecionada (letra embaralhada) para a letra original
      const originalLetter = getOriginalLetter(selectedAnswer)
      const isCorrect = originalLetter === currentQuestion.correctAlternative
      setStats((prev) => ({
        total: prev.total + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        incorrect: !isCorrect ? prev.incorrect + 1 : prev.incorrect,
      }))
      if (currentQuestionIndex !== null) {
        setAnsweredQuestions((prev) => new Set(prev).add(currentQuestionIndex))
      }
    }
  }

  // Avança para o próximo índice sequencialmente dentro do array (embaralhado)
  const goToNextInOrder = () => {
    const nextIdx = getNextIndexSequential(questions.length, currentQuestionIndex)
    if (nextIdx !== null) {
      setDirection(1)
      setTimeout(() => {
        setCurrentQuestionIndex(nextIdx)
        setSelectedAnswer(null)
        setIsAnswered(false)
        setDirection(0)
      }, 200)
    } else {
      setShowStats(true)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex !== null && !answeredQuestions.has(currentQuestionIndex)) {
      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestionIndex))
    }
    goToNextInOrder()
  }

  const handleSkipQuestion = () => {
    if (currentQuestionIndex !== null) {
      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestionIndex))
    }
    goToNextInOrder()
  }

  const handleRestart = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setStats({ total: 0, correct: 0, incorrect: 0 })
    setShowStats(false)
    setAnsweredQuestions(new Set())
  }



  // Loading
  if (loading || (subject === "linguagens" && !selectedLanguage)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div
              className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-purple-500 rounded-full animate-spin mx-auto"
              style={{ animationDelay: "0.1s", animationDuration: "1.5s" }}
            ></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Carregando questões</h2>
            <p className="text-muted-foreground animate-pulse">Preparando seu simulado...</p>
          </div>
        </div>
      </div>
    )
  }

  // Nenhuma questão
  if (!questions.length || currentQuestionIndex === null || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-2xl border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl text-foreground">Nenhuma questão encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Não encontramos questões para a matéria selecionada.</p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o início
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Resultado (tela de resultados com visual melhorado)
  if (showStats) {
    const totalQuestions = stats.total
    const correctAnswers = stats.correct
    const incorrectAnswers = stats.incorrect
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    const getPerformanceLevel = () => {
      if (percentage >= 80)
        return { level: "Excelente!", color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: Trophy }
      if (percentage >= 60) return { level: "Bom", color: "text-blue-400", bgColor: "bg-blue-500/20", icon: Target }
      if (percentage >= 40)
        return { level: "Regular", color: "text-yellow-400", bgColor: "bg-yellow-500/20", icon: TrendingUp }
      return { level: "Precisa melhorar", color: "text-red-400", bgColor: "bg-red-500/20", icon: TrendingUp }
    }

    const performance = getPerformanceLevel()
    const PerformanceIcon = performance.icon

    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/`)}
                  className="text-white hover:bg-white/10 rounded-full"
                >
                  <Home className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-white">Pergamo</h1>
                  <p className="text-sm text-slate-300 hidden sm:block">Simulado finalizado</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
                <CardHeader className="text-center pb-6 relative">
                  <motion.div
                    className={`mx-auto w-20 h-20 rounded-full ${performance.bgColor} flex items-center justify-center mb-6`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  >
                    <PerformanceIcon className={`h-10 w-10 ${performance.color}`} />
                  </motion.div>
                  <CardTitle className="text-3xl font-bold text-white mb-2">Resultado Final</CardTitle>
                  <p className="text-slate-300">Seu desempenho em</p>
                  <div className="flex justify-center mt-3">
                    <Badge className="bg-white/20 text-white border-0 px-4 py-1 inline-block">
                      {getSubjectName(subject)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8 relative">
                  <div className="text-center">
                    <motion.div
                      className="text-6xl font-bold mb-3"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
                    >
                      <span className={`${performance.color} drop-shadow-lg`}>{percentage}%</span>
                    </motion.div>
                    <p className={`text-xl font-semibold ${performance.color}`}>{performance.level}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Progress value={percentage} className="h-4 bg-white/20" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-30"></div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                    <div className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-3xl font-bold text-white mb-1">{totalQuestions}</div>
                      <div className="text-sm text-slate-300">Questões</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-500/10 rounded-xl">
                      <div className="text-3xl font-bold text-emerald-400 mb-1">{correctAnswers}</div>
                      <div className="text-sm text-slate-300">Acertos</div>
                    </div>
                    <div className="text-center p-4 bg-red-500/10 rounded-xl">
                      <div className="text-3xl font-bold text-red-400 mb-1">{incorrectAnswers}</div>
                      <div className="text-sm text-slate-300">Erros</div>
                    </div>
                  </div>

                  {/* Tempo total e tempo médio por questão */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                    <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, "0")}
                      </div>
                      <div className="text-sm text-slate-300">Tempo total</div>
                    </div>
                    <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                      <div className="text-3xl font-bold text-purple-400 mb-1">
                        {totalQuestions > 0 
                          ? `${Math.floor((totalTime / totalQuestions) / 60)}:${Math.floor((totalTime / totalQuestions) % 60).toString().padStart(2, "0")}` 
                          : "0:00"}
                      </div>
                      <div className="text-sm text-slate-300">Tempo médio por questão</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
              <Button
                onClick={handleRestart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Questão
  const totalRespondidas =
    answeredQuestions.size +
    (isAnswered && currentQuestionIndex !== null && !answeredQuestions.has(currentQuestionIndex) ? 1 : 0)
  const progress = questions.length ? (totalRespondidas / questions.length) * 100 : 0

  function cn(...args: (string | boolean | undefined | null)[]) {
    return args.filter(Boolean).join(" ")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/`)}
                className="text-white hover:bg-white/10 rounded-full"
              >
                <Home className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Pergamo</h1>
                <p className="text-sm text-slate-300 hidden sm:block">
                  {subject === "linguagens" && selectedLanguage 
                    ? `Linguagens (${getSubjectName(selectedLanguage)})` 
                    : getSubjectName(subject)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!loading && questions.length > 0 && subject === "linguagens" && selectedLanguage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push('/')
                  }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm hidden sm:flex"
                >
                  Trocar língua
                </Button>
              )}
              {!loading && questions.length > 0 ? (
                <>
                  <div className="hidden sm:flex items-center gap-4 text-sm text-white">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span>
                        Questão {currentQuestionIndex !== null ? currentQuestionIndex + 1 : 0} de {totalQuestionsCount || questions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <span>
                        {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStats(true)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    Finalizar
                  </Button>
                </>
              ) : (
                <div className="text-sm text-slate-300">Carregando...</div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="relative">
              <Progress value={progress} className="h-2 bg-white/20" />
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-50"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-300 sm:hidden">
              <span>
                Questão {currentQuestionIndex !== null ? currentQuestionIndex + 1 : 0}/{totalQuestionsCount || questions.length}
              </span>
              <span>
                {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          key={currentQuestionIndex ?? "none"}
          initial={{ opacity: 0, x: direction > 0 ? 50 : direction < 0 ? -50 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>

            <CardHeader className="pb-6 relative">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-blue-500/20 text-blue-300 border-0 px-3 py-1">{getSubjectName(subject)}</Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-0 px-3 py-1">
                  ENEM {currentQuestion.year}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-slate-300 ml-auto">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="bg-white/10 px-2 py-1 rounded-full">
                    {Math.floor(questionTime / 60)}:{(questionTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{currentQuestion.title}</h2>
            </CardHeader>

            <CardContent className="space-y-6 relative">
              <div className="prose prose-invert max-w-none">
                <div className="text-slate-200 leading-relaxed text-base">
                  {formatContext(
                    currentQuestion.context,
                    currentQuestion.files ?? [],
                    currentQuestion.dirName,
                    currentQuestion.year,
                  )}
                </div>
              </div>

              <div className="text-white font-medium text-lg">
                {parseMarkdown(currentQuestion.alternativesIntroduction)}
              </div>

              <div className="space-y-3">
                {shuffledAlternatives.map((alt) => {
                  const isSelected = selectedAnswer === alt.letter
                  // Encontrar a letra correta na posição embaralhada
                  const correctShuffledLetter = getCorrectShuffledLetter()
                  const isCorrectAlt = alt.letter === correctShuffledLetter

                  const optionClasses = cn(
                    "w-full p-4 sm:p-5 text-left rounded-xl border-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group",
                    !isAnswered && "border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30",
                    isSelected && !isAnswered && "border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/25",
                    isAnswered &&
                      isCorrectAlt &&
                      "border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/25",
                    isAnswered &&
                      isSelected &&
                      !isCorrectAlt &&
                      "border-red-400 bg-red-500/20 shadow-lg shadow-red-500/25",
                  )

                  return (
                    <motion.button
                      key={alt.letter}
                      onClick={() => !isAnswered && handleSelectAnswer(alt.letter)}
                      disabled={isAnswered}
                      className={optionClasses}
                      whileHover={{ scale: isAnswered ? 1 : 1.01 }}
                      whileTap={{ scale: isAnswered ? 1 : 0.99 }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors",
                            !isAnswered &&
                              "border-white/40 text-white/70 group-hover:border-white/60 group-hover:text-white",
                            isSelected && !isAnswered && "border-blue-400 text-blue-400 bg-blue-500/20",
                            isAnswered && isCorrectAlt && "border-emerald-400 text-emerald-400 bg-emerald-500/20",
                            isAnswered && isSelected && !isCorrectAlt && "border-red-400 text-red-400 bg-red-500/20",
                          )}
                        >
                          {alt.letter}
                        </div>
                        <div className="flex-1 text-white leading-relaxed text-base">
                          {alt.text && parseMarkdown(alt.text)}
                          {alt.file && (
                            <div className="mt-3 flex justify-center">
                              <ClickableImage
                                src={alt.file || "/placeholder.svg"}
                                alt={`Alternativa ${alt.letter}`}
                                className="max-h-48 rounded-lg shadow-lg"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          {isAnswered && isCorrectAlt && <CheckCircle className="h-6 w-6 text-emerald-400" />}
                          {isAnswered && isSelected && !isCorrectAlt && <XCircle className="h-6 w-6 text-red-400" />}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    className={cn(
                      "p-4 sm:p-5 rounded-xl border-2 flex items-start gap-3 shadow-lg",
                      selectedAnswer === getCorrectShuffledLetter()
                        ? "border-emerald-400 bg-emerald-500/20 shadow-emerald-500/25"
                        : "border-red-400 bg-red-500/20 shadow-red-500/25",
                    )}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                      },
                    }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  >
                    <div className="mt-0.5">
                      {selectedAnswer === getCorrectShuffledLetter() ? (
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">
                        {selectedAnswer === getCorrectShuffledLetter()
                          ? "🎉 Resposta correta!"
                          : "❌ Resposta incorreta!"}
                      </p>
                      <p className="text-slate-200 mt-1">
                        {selectedAnswer === getCorrectShuffledLetter()
                          ? `Parabéns! Esse foi seu ${stats.correct}º acerto!`
                          : `A alternativa correta é a letra ${getCorrectShuffledLetter()}.`}
                      </p>
                    </div>
                    {selectedAnswer !== getCorrectShuffledLetter() && (
                      <div className="ml-4 hidden sm:block">
                        <ExplanationButton 
                          question={currentQuestion} 
                          isAnswered={isAnswered}
                          userAnswer={selectedAnswer}
                          shuffledAlternatives={shuffledAlternatives}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 mt-6 relative">
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleConfirmAnswer}
                  disabled={!selectedAnswer || isAnswered}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar resposta
                </Button>
                {!isAnswered && totalRespondidas < questions.length - 1 && (
                  <Button
                    onClick={handleSkipQuestion}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Pular
                  </Button>
                )}
              </div>
              {/* Botão de explicação para mobile */}
              {isAnswered && selectedAnswer !== getCorrectShuffledLetter() && (
                <div className="w-full sm:hidden">
                  <ExplanationButton 
                    question={currentQuestion} 
                    isAnswered={isAnswered}
                    userAnswer={selectedAnswer}
                    shuffledAlternatives={shuffledAlternatives}
                  />
                </div>
              )}
              {isAnswered && (
                <Button
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg"
                >
                  {totalRespondidas < questions.length - 1 ? "Próxima questão" : "Ver resultado"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
