"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Home, ArrowRight, CheckCircle, XCircle, BookOpen, Info, SkipForward, Clock, Trophy, Target, TrendingUp, RotateCcw, Loader2 } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
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
  return <img src={src} alt={alt} className="max-w-full h-auto rounded-md" onError={() => setError(true)} />
}

// Formatar contexto + imagens inline
function formatContext(
  context: string | undefined | null,
  files: string[],
  dirName?: string,
  year?: number
) {
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
    let cancelled = false
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/questions/${subject}`)
        if (!response.ok) throw new Error(`Erro ao carregar questões: ${response.status}`)
          const data = await response.json()
          if (cancelled) return
        // Embaralha a ordem das questões por sessão (Fisher-Yates)
        const shuffled = [...data]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          const tmp = shuffled[i]
          shuffled[i] = shuffled[j]
          shuffled[j] = tmp
        }
        setQuestions(shuffled)
        setSubjectName(getSubjectName(subject))
        // Começar pela primeira posição do array embaralhado
        setCurrentQuestionIndex(shuffled.length > 0 ? 0 : null)
        // iniciar timer total a partir do momento em que as questões estiverem prontas
        if (shuffled.length > 0) {
          // limpar caso já exista (segurança)
          if (totalTimerId.current) {
            clearInterval(totalTimerId.current)
          }
          setTotalTime(0)
          totalTimerId.current = window.setInterval(() => setTotalTime((s) => s + 1), 1000)
        }
      } catch (error) {
        console.error("Erro ao carregar questões:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (subject) fetchQuestions()
    return () => { cancelled = true }
  }, [subject])

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


  // Loading
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#131a24]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          </div>
          <p className="text-white text-lg animate-pulse">Carregando questões...</p>
        </div>
      </div>
    )
  }

  // Nenhuma questão
  if (!questions.length || currentQuestionIndex === null || !currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center shadow-lg">
          <CardTitle>Nenhuma questão encontrada</CardTitle>
          <CardContent>
            <p>Não encontramos questões para a matéria selecionada.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/")}>Voltar para a página inicial</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Resultado (tela de resultados com visual melhorado)
  if (showStats) {
    const totalQuestions = stats.total // Agora usando o total de questões respondidas
    const correctAnswers = stats.correct
    const incorrectAnswers = stats.incorrect
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    const getPerformanceLevel = () => {
      if (percentage >= 80) return { level: "Excelente", color: "text-success", icon: Trophy }
      if (percentage >= 60) return { level: "Bom", color: "text-primary", icon: Target }
      if (percentage >= 40) return { level: "Regular", color: "text-warning", icon: TrendingUp }
      return { level: "Precisa melhorar", color: "red-400", icon: TrendingUp }
    }

    const performance = getPerformanceLevel()
    const PerformanceIcon = performance.icon

    return (
      <div className="min-h-screen bg-[#131a24]">
        <header className="sticky top-0 z-10 bg-[#131a24] backdrop-blur supports-[backdrop-filter]:bg-[#131a24]/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/`)}>
                  <Home className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-bold">Questões ENEM</h1>
              </div>

              <div className="flex items-center gap-4">
                <ModeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 bg-[#131a24]">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="bg-gradient-card">
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto w-16 h-16 rounded-full bg-current/10 flex items-center justify-center ${performance.color} mb-4`}>
                  <PerformanceIcon className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl mb-2">Resultado</CardTitle>
                <p className="text-muted-foreground">Seu desempenho em</p>
                <div className="flex justify-center mt-2">
                  <Badge 
                    variant={percentage >= 60 ? "success" : percentage < 40 ? "destructive" : "outline"} 
                    className="text-sm inline-block w-auto"
                  >
                    {getSubjectName(subject)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    <span className={performance.color}>{percentage}%</span>
                  </div>
                  <p className={`text-lg font-medium ${percentage < 40 ? 'text-red-400' : performance.color}`}>{performance.level}</p>
                </div>

                <div className="space-y-2">
                  <Progress value={percentage} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">Questões respondidas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success"> {/* Mantendo a mesma cor dos acertos */}
                      {correctAnswers}
                    </div>
                    <div className="text-sm text-muted-foreground">Acertos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400"> {/* Usando a mesma cor dos erros */}
                      {incorrectAnswers}
                    </div>
                    <div className="text-sm text-muted-foreground">Erros</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => router.push("/")} className="flex-1">Voltar para o início</Button>
              <Button onClick={handleRestart} className="flex-1 bg-gradient-primary">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>

            <Card className="bg-gradient-card">
              <CardHeader>
                <CardTitle className="text-lg">Dica de estudo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {percentage >= 80
                    ? "Parabéns! Continue praticando para manter esse excelente desempenho."
                    : percentage >= 60
                    ? "Bom trabalho! Continue estudando para alcançar a excelência."
                    : percentage >= 40
                    ? "Você está no caminho certo. Dedique mais tempo aos estudos dessa matéria."
                    : "Não desanime! Revise o conteúdo e pratique mais questões para melhorar."
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Questão
  const totalRespondidas = answeredQuestions.size + (isAnswered && currentQuestionIndex !== null && !answeredQuestions.has(currentQuestionIndex) ? 1 : 0)

  const progress = questions.length ? ((totalRespondidas / questions.length) * 100) : 0

  // Utility to join class names conditionally
  function cn(...args: (string | boolean | undefined | null)[]) {
    return args.filter(Boolean).join(" ");
  }

  return (
    <div className="min-h-screen bg-[#131a24]">
      <header className="sticky top-0 z-10 bg-[#131a24] backdrop-blur supports-[backdrop-filter]:bg-[#131a24]/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push(`/`)} className="text-white hover:bg-white/10">
                <Home className="h-4 w-4 text-white" />
              </Button>
              <h1 className="text-xl font-bold text-white">Questões ENEM</h1>
            </div>

            <div className="flex items-center gap-4">
              {!loading && questions.length > 0 ? (
                <>
                  <div className="text-sm text-white">
                    Questão {currentQuestionIndex !== null ? (currentQuestionIndex + 1) : 0} de {questions.length}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-white">
                    <Clock className="h-4 w-4 text-white" />
                    <span>{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowStats(true)} className="text-white border-2 border-white hover:bg-white/10">
                    Finalizar
                  </Button>
                </>
              ) : (
                <div className="text-sm text-white">Carregando...</div>
              )}
            </div>
          </div>

          <Progress value={progress} className="mt-4 h-2" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 bg-[#131a24]">
  <Card key={currentQuestionIndex ?? 'none'} className="max-w-4xl mx-auto p-6 shadow-md border-2 border-neutral-200 dark:border-neutral-800" style={{ backgroundImage: 'var(--gradient-card)' }}>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <div className="flex justify-center">
                  <Badge variant="outline" className="text-sm inline-block w-auto">{getSubjectName(subject)}</Badge>
                </div>
              <Badge variant="secondary">ENEM {currentQuestion.year}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                <Clock className="h-4 w-4" />
                <span>{Math.floor(questionTime / 60)}:{(questionTime % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-4">{currentQuestion.title}</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-invert max-w-none">
              <div className="text-foreground leading-relaxed">{formatContext(currentQuestion.context, currentQuestion.files ?? [], currentQuestion.dirName, currentQuestion.year)}</div>
            </div>

            <p className="font-medium mt-4 mb-2">{parseMarkdown(currentQuestion.alternativesIntroduction)}</p>

            <div className="space-y-3">
              {currentQuestion.alternatives.map((alt) => {
                const isSelected = selectedAnswer === alt.letter
                const isCorrectAlt = alt.letter === currentQuestion.correctAlternative

                const optionClasses = cn(
                  "w-full p-4 text-left rounded-lg border-2 transition-all duration-200 hover:bg-secondary/50 focus:ring-2 focus:ring-ring focus:outline-none transform hover:scale-[1.01] active:scale-[0.99]",
                  selectedAnswer === alt.letter && !isAnswered && "border-primary bg-primary/10",
                  isAnswered && isCorrectAlt && "border-success bg-success/10 text-success-foreground",
                  isAnswered && isSelected && !isCorrectAlt && "border-red-400 bg-red-400/10 text-red-400"
                )

                return (
                  <button
                    key={alt.letter}
                    onClick={() => !isAnswered && handleSelectAnswer(alt.letter)}
                    disabled={isAnswered}
                    className={optionClasses}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-medium">{alt.letter}</span>
                      <span className="flex-1 leading-relaxed">{alt.text && parseMarkdown(alt.text)}
                        {alt.file && (
                          <div className="mt-2 flex justify-center">
                            <img src={alt.file} alt={`Alternativa ${alt.letter}`} className="max-h-40 rounded" />
                          </div>
                        )}
                      </span>
                      <div className="flex items-center ml-2">
                        {isAnswered && isCorrectAlt && (<CheckCircle className="h-5 w-5 text-success" />)}
                        {isAnswered && isSelected && !isCorrectAlt && (<XCircle className="h-5 w-5 text-red-400" />)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <AnimatePresence>
              {isAnswered && (
                <motion.div 
                  className={cn(
                    "p-4 rounded-lg border-2 flex items-start gap-2",
                    selectedAnswer === currentQuestion.correctAlternative
                      ? "border-success bg-success/10 text-success-foreground"
                      : "border-red-400 bg-red-400/10 text-red-400"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { 
                      type: "tween",
                      duration: 0.3,
                      ease: "easeOut"
                    } 
                  }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="mt-0.5">
                    {selectedAnswer === currentQuestion.correctAlternative ? 
                      <CheckCircle className="h-5 w-5 text-success" /> : 
                      <XCircle className="h-5 w-5 text-red-400" />
                    }
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedAnswer === currentQuestion.correctAlternative ? 
                        "Resposta correta!" : 
                        "Resposta incorreta!"
                      }
                    </p>
                    <p className="text-sm mt-1">
                      {selectedAnswer === currentQuestion.correctAlternative ? 
                        `Parabéns! Esse foi seu ${stats.correct}º acerto!` : 
                        `A alternativa correta é a letra ${currentQuestion.correctAlternative}.`
                      }
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </CardContent>
          <CardFooter className="flex justify-between mt-4">
            <div className="flex gap-2">
              <Button onClick={handleConfirmAnswer} disabled={!selectedAnswer || isAnswered}>
                Confirmar
              </Button>
              {!isAnswered && totalRespondidas < questions.length - 1 && (
                <Button onClick={handleSkipQuestion} variant="outline"><SkipForward className="h-4 w-4 mr-1" /> Pular</Button>
              )}
            </div>
            {isAnswered && (
              <Button onClick={handleNextQuestion} className="flex items-center gap-1">
                {totalRespondidas < questions.length - 1 ? "Próxima" : "Ver resultado"} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
