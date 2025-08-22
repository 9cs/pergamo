"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  Languages,
  Flag,
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

// SafeImage com fallback
function SafeImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)
  if (error) {
    return <img src="/placeholder.svg" alt="Imagem não encontrada" className="max-w-full h-auto rounded-md" />
  }
  return (
    <img
      src={src || "/placeholder.svg"}
      alt={alt}
      className="max-w-full h-auto rounded-md"
      onError={() => setError(true)}
    />
  )
}

// Formatar contexto + imagens inline
function formatContext(context: string | undefined | null, files: string[], dirName?: string, year?: number) {
  if (!context) return null
  const parts = context.split("[imagem]")
  let fileIndex = 0
  const basePath = year && dirName ? `/year/${year}/questions/${dirName}` : ""

  return (
    <div className="context-block whitespace-pre-line">
      {parts.map((part, i) => (
        <div key={i} className="mb-4">
          {parseMarkdown(part)}
          {i < parts.length - 1 && files[fileIndex] && (
            <div className="my-4 flex justify-center">
              <SafeImage src={`${basePath}/${files[fileIndex++]}`} alt={`Imagem da questão`} />
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

  // Estado para controlar a seleção de língua para o subject "linguagens"
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)

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

  // Função para lidar com a seleção de língua
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language)
    setShowLanguageSelector(false)
  }

  // Verificar se é o subject de linguagens e mostrar o seletor de língua
  useEffect(() => {
    if (subject === "linguagens" && !selectedLanguage) {
      setShowLanguageSelector(true)
    }
  }, [subject, selectedLanguage])

  // per-question timer resets on question change
  useEffect(() => {
    setQuestionTime(0)
    const q = setInterval(() => setQuestionTime((s) => s + 1), 1000)
    return () => clearInterval(q)
  }, [currentQuestionIndex])
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
    // Se for linguagens e não selecionou língua ainda, mostrar seletor e não carregar questões
    if (subject === "linguagens" && !selectedLanguage) {
      setShowLanguageSelector(true)
      setLoading(false)
      return
    }

    // Se for linguagens e já tem língua selecionada, carregar apenas as questões dessa língua
    if (subject === "linguagens" && selectedLanguage) {
      loadQuestions(selectedLanguage)
      return
    }

    // Para outros subjects, carregar normalmente
    loadQuestions(subject)
  }, [subject, selectedLanguage])

  const loadQuestions = async (languageSubject: string) => {
    try {
      setLoading(true)
      console.log("Carregando questões para língua:", languageSubject)
      
      // Carregar questões da língua selecionada
      const languageResponse = await fetch(`/api/questions/${languageSubject}`)
      if (!languageResponse.ok) throw new Error(`Erro ao carregar questões de ${languageSubject}: ${languageResponse.status}`)
      const languageData = await languageResponse.json()
      console.log("Questões de", languageSubject, ":", languageData.length, "questões")
      
      // Carregar questões de português
      const portuguesResponse = await fetch(`/api/questions/portugues`)
      if (!portuguesResponse.ok) throw new Error(`Erro ao carregar questões de português: ${portuguesResponse.status}`)
      const portuguesData = await portuguesResponse.json()
      console.log("Questões de português:", portuguesData.length, "questões")
      
      // Carregar questões de literatura
      const literaturaResponse = await fetch(`/api/questions/literatura`)
      if (!literaturaResponse.ok) throw new Error(`Erro ao carregar questões de literatura: ${literaturaResponse.status}`)
      const literaturaData = await literaturaResponse.json()
      console.log("Questões de literatura:", literaturaData.length, "questões")
      
      // Combinar todas as questões
      const allData = [...languageData, ...portuguesData, ...literaturaData]
      console.log("Total de questões combinadas:", allData.length, "questões")
      
      // Embaralha a ordem das questões por sessão (Fisher-Yates)
      const shuffled = [...allData]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = shuffled[i]
        shuffled[i] = shuffled[j]
        shuffled[j] = tmp
      }
      console.log("Questões embaralhadas:", shuffled.length, "questões")
      setQuestions(shuffled)
      setSubjectName(`${getSubjectName(languageSubject)} (Linguagens)`)
      // Começar pela primeira posição do array embaralhado
      setCurrentQuestionIndex(shuffled.length > 0 ? 0 : null)
      // iniciar timer total a partir do momento em que as questões estiverem prontas
      if (shuffled.length > 0) {
        // limpar caso já exista (segurança)
        if (totalTimerId.current) {
          clearInterval(totalTimerId.current)
        }
        totalTimerId.current = window.setInterval(() => {
          setTotalTime((prev) => prev + 1)
        }, 1000)
      }
    } catch (error) {
      console.error("Erro ao carregar questões:", error)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = currentQuestionIndex !== null ? questions[currentQuestionIndex] : undefined

  // Handlers
  const handleSelectAnswer = (letter: string) => !isAnswered && setSelectedAnswer(letter)

  const handleConfirmAnswer = () => {
    if (selectedAnswer && currentQuestion) {
      setIsAnswered(true)
      const isCorrect = selectedAnswer === currentQuestion.correctAlternative
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

  // Seletor de língua para Linguagens
  if (showLanguageSelector && subject === "linguagens" && !selectedLanguage) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-foreground">Escolha a língua estrangeira</h3>
            <p className="text-muted-foreground mt-2">Selecione qual língua você gostaria de praticar:</p>
          </div>
          
          <div className="space-y-3">
            <Button
              className="w-full justify-start gap-3 h-14 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-foreground"
              onClick={() => handleLanguageSelect("ingles")}
            >
              <Languages className="h-5 w-5 text-blue-400" />
              <div className="text-left">
                <div className="font-semibold">Inglês</div>
                <div className="text-sm text-muted-foreground">English questions</div>
              </div>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-14 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-foreground"
              onClick={() => handleLanguageSelect("espanhol")}
            >
              <Flag className="h-5 w-5 text-orange-400" />
              <div className="text-left">
                <div className="font-semibold">Espanhol</div>
                <div className="text-sm text-muted-foreground">Preguntas en español</div>
              </div>
            </Button>

            <div className="pt-2 border-t border-border/50">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-border/50 hover:bg-muted/50 bg-transparent"
                onClick={() => router.push("/")}
              >
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span>Voltar para o início</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
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
  if ((!questions.length && subject !== "linguagens") || (questions.length === 0 && selectedLanguage) || currentQuestionIndex === null || !currentQuestion) {
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
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
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
        return { level: "Excelente", color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: Trophy }
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
                  <h1 className="text-xl font-bold text-white">Questões ENEM</h1>
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
                  <Badge className="mt-3 bg-white/20 text-white border-0 px-4 py-1">{getSubjectName(subject)}</Badge>
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
      {/* Seletor de língua para Linguagens */}
      {showLanguageSelector && subject === "linguagens" && !selectedLanguage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground">Escolha a língua estrangeira</h3>
              <p className="text-muted-foreground mt-2">Selecione qual língua você gostaria de praticar:</p>
            </div>
            
            <div className="space-y-3">
              <Button
                className="w-full justify-start gap-3 h-14 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 text-foreground"
                onClick={() => handleLanguageSelect("ingles")}
              >
                <Languages className="h-5 w-5 text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold">Inglês</div>
                  <div className="text-sm text-muted-foreground">English questions</div>
                </div>
              </Button>

              <Button
                className="w-full justify-start gap-3 h-14 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/30 hover:to-red-600/30 border border-orange-500/30 text-foreground"
                onClick={() => handleLanguageSelect("espanhol")}
              >
                <Flag className="h-5 w-5 text-orange-400" />
                <div className="text-left">
                  <div className="font-semibold">Espanhol</div>
                  <div className="text-sm text-muted-foreground">Preguntas en español</div>
                </div>
              </Button>

              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 border-border/50 hover:bg-muted/50 bg-transparent"
                  onClick={() => router.push("/")}
                >
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span>Voltar para o início</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <h1 className="text-xl font-bold text-white">Questões ENEM</h1>
                <p className="text-sm text-slate-300 hidden sm:block">
                  {subject === "linguagens" && selectedLanguage 
                    ? `${getSubjectName(selectedLanguage)} (Linguagens)` 
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
                    setSelectedLanguage(null)
                    setShowLanguageSelector(true)
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
                        Questão {currentQuestionIndex !== null ? currentQuestionIndex + 1 : 0} de {questions.length}
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
                Questão {currentQuestionIndex !== null ? currentQuestionIndex + 1 : 0}/{questions.length}
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
                {currentQuestion.alternatives.map((alt) => {
                  const isSelected = selectedAnswer === alt.letter
                  const isCorrectAlt = alt.letter === currentQuestion.correctAlternative

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
                              <img
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
                      selectedAnswer === currentQuestion.correctAlternative
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
                      {selectedAnswer === currentQuestion.correctAlternative ? (
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">
                        {selectedAnswer === currentQuestion.correctAlternative
                          ? "🎉 Resposta correta!"
                          : "❌ Resposta incorreta!"}
                      </p>
                      <p className="text-slate-200 mt-1">
                        {selectedAnswer === currentQuestion.correctAlternative
                          ? `Parabéns! Esse foi seu ${stats.correct}º acerto!`
                          : `A alternativa correta é a letra ${currentQuestion.correctAlternative}.`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 mt-6 relative">
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
