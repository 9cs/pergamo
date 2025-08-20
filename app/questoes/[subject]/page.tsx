"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Home, ArrowRight, CheckCircle, XCircle, BookOpen, Info, SkipForward } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"

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

// Função para converter _itálico_ e **negrito** em <em> e <strong>
function parseMarkdown(text: string | undefined | null) {
  if (!text) return null;
  // Primeiro, divide por negrito (**)
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.flatMap((part, i) => {
    if (part.match(/^\*\*[^*]+\*\*$/)) {
      // Recursivamente processa itálico dentro do negrito
      const inner = part.slice(2, -2);
      return <strong key={`b${i}`}>{parseMarkdown(inner)}</strong>;
    }
    // Agora divide por itálico (_)
    const italicParts = part.split(/(_[^_]+_)/g);
    return italicParts.map((sub, j) => {
      if (sub.match(/^_[^_]+_$/)) {
        return <em key={`i${i}-${j}`}>{sub.slice(1, -1)}</em>;
      }
      return sub;
    });
  });
}

function getRandomUnansweredIndex(total: number, answered: Set<number>): number | null {
  const unanswered = []
  for (let i = 0; i < total; i++) {
    if (!answered.has(i)) unanswered.push(i)
  }
  if (unanswered.length === 0) return null
  const randomIdx = Math.floor(Math.random() * unanswered.length)
  return unanswered[randomIdx]
}

export default function QuestionsPage() {
  const router = useRouter()
  const params = useParams()
  const subject = params.subject as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
  })
  const [showStats, setShowStats] = useState(false)
  const [direction, setDirection] = useState(0)
  const [subjectName, setSubjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())

  // Função para obter o nome da matéria
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

  // Função para carregar questões
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/questions/${subject}`)

        if (!response.ok) {
          throw new Error(`Erro ao carregar questões: ${response.status}`)
        }

        const data = await response.json()
        setQuestions(data)
        setSubjectName(getSubjectName(subject))
        setLoading(false)
      } catch (error) {
        console.error("Erro ao carregar questões:", error)
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [subject])

  const currentQuestion = questions[currentQuestionIndex]

  const handleSelectAnswer = (letter: string) => {
    if (!isAnswered) {
      setSelectedAnswer(letter)
    }
  }

  const handleConfirmAnswer = () => {
    if (selectedAnswer) {
      setIsAnswered(true)
      setShowExplanation(false)

      const isCorrect = selectedAnswer === currentQuestion.correctAlternative

      setStats((prev) => ({
        total: prev.total + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        incorrect: !isCorrect ? prev.incorrect + 1 : prev.incorrect,
      }))

      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestionIndex))
    }
  }

  const goToRandomUnanswered = () => {
    const nextIdx = getRandomUnansweredIndex(questions.length, new Set([...answeredQuestions, currentQuestionIndex]))
    if (nextIdx !== null) {
      setDirection(1)
      setShowExplanation(false)
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
    // Marca como respondida se não foi pulada
    if (!answeredQuestions.has(currentQuestionIndex)) {
      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestionIndex))
    }
    goToRandomUnanswered()
  }

  const handleSkipQuestion = () => {
    // Marca como respondida (pulada)
    setAnsweredQuestions((prev) => new Set(prev).add(currentQuestionIndex))
    goToRandomUnanswered()
  }

  const handleFinish = () => {
    setShowStats(true)
  }

  const handleRestart = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setShowExplanation(false)
    setStats({
      total: 0,
      correct: 0,
      incorrect: 0,
    })
    setShowStats(false)
    setAnsweredQuestions(new Set())
  }

  const toggleExplanation = () => {
    setShowExplanation(!showExplanation)
  }

  // Função para formatar o contexto com imagens inline
  function formatContext(context: string | undefined | null, files: string[], dirName?: string, year?: number) {
  if (!context) return null

  // Divide o texto em partes pelo marcador [imagem]
  const parts = context.split("[imagem]")

  // Caminho base para a pasta da questão (já que está em /public)
  // Exemplo: /public/2010/questions/102/233eafdb.jpg
  let fileIndex = 0
  const basePath = year && dirName ? `/${year}/questions/${dirName}` : ""

  return (
  <div className="context-block whitespace-pre-line">
  {parts.map((part, i) => (
  <span key={i} className="inline-block">
    {/* Renderiza o texto */}
    {parseMarkdown(part)}

    {/* Se houver marcador [imagem] neste ponto, insere a imagem correspondente */}
    {i < parts.length - 1 && files[fileIndex] && (
      <div className="my-4 flex justify-center">
        <img
          src={`${basePath}/${files[fileIndex++]}`}
          alt={`Imagem da questão`}
          className="max-w-full h-auto rounded-md"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg?height=300&width=400"
          }}
        />
      </div>
    )}
  </span>
  ))}
  </div>
  )
  }


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-center">
          <p className="text-lg">Carregando questões...</p>
          <div className="mt-4 h-2 w-40 bg-primary/30 rounded mx-auto"></div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold title-gradient">Questões ENEM</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/")} variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
            <ModeToggle />
          </div>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Nenhuma questão encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Não encontramos questões para a matéria selecionada. Por favor, escolha outra matéria.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/")} className="button-primary">
              Voltar para a página inicial
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (showStats) {
    return (
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold title-gradient">Resultado</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/")} variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
            <ModeToggle />
          </div>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Seu desempenho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between stats-item">
                <span>Total de questões respondidas:</span>
                <span className="font-bold">{stats.total}</span>
              </div>
              <div className="flex justify-between stats-item">
                <span>Acertos:</span>
                <span className="font-bold text-success">{stats.correct}</span>
              </div>
              <div className="flex justify-between stats-item">
                <span>Erros:</span>
                <span className="font-bold text-destructive">{stats.incorrect}</span>
              </div>
              <div className="flex justify-between stats-item">
                <span>Percentual de acertos:</span>
                <span className="font-bold text-primary">
                  {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                </span>
              </div>
            </div>

            <div className="space-y-2 animate-fade-in">
              <p className="text-sm">Desempenho:</p>
              <Progress value={stats.total > 0 ? (stats.correct / stats.total) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={() => router.push("/")} className="button-primary">
              Voltar para o início
            </Button>
            <Button onClick={handleRestart} variant="outline">
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Quantas já foram respondidas/puladas
  const totalRespondidas = answeredQuestions.size + (isAnswered && !answeredQuestions.has(currentQuestionIndex) ? 1 : 0)

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold title-gradient">Questões ENEM</h1>
          <div className="flex items-center mt-2">
            <span className="mr-2">{subjectName}</span>
            <Badge variant="outline" className="bg-secondary/50">
              {questions.length} questões disponíveis
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/")} variant="outline" size="icon">
            <Home className="h-4 w-4" />
          </Button>
          <ModeToggle />
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm">
          <span className="question-number">Questão {totalRespondidas + 1}</span> de {questions.length}
        </div>
        <Button variant="outline" size="sm" onClick={handleFinish}>
          Finalizar
        </Button>
      </div>

      <Progress value={(totalRespondidas / questions.length) * 100} className="h-2 mb-6" />

      <div
        className={`transition-all duration-200 transform ${
          direction > 0
            ? "-translate-x-[20px] opacity-0"
            : direction < 0
              ? "translate-x-[20px] opacity-0"
              : "translate-x-0 opacity-100"
        }`}
      >
        <Card className="mb-6 question-card animate-fade-in">
          <CardHeader>
            <CardTitle>{currentQuestion.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {formatContext(
              currentQuestion.context,
              currentQuestion.files ?? [],
              currentQuestion.dirName,      // ex.: "102" ou "94-espanhol"
              currentQuestion.year
            )}

            {currentQuestion.files.length > 0 && !currentQuestion.context.includes("![](") && (
              <div className="my-4 flex justify-center">
                <img
                  src={currentQuestion.files[0] || "/placeholder.svg?height=300&width=400"}
                  alt="Imagem da questão"
                  className="max-w-full h-auto rounded-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=300&width=400"
                  }}
                />
              </div>
            )}

            <p className="font-medium mt-4 mb-2">{parseMarkdown(currentQuestion.alternativesIntroduction)}</p>

            <RadioGroup value={selectedAnswer || ""} className="space-y-3 mt-4">
              {currentQuestion.alternatives.map((alternative) => (
                <div
                  key={alternative.letter}
                  className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-all duration-150 alternative-item animate-fade-in ${
                    isAnswered && alternative.letter === currentQuestion.correctAlternative
                      ? "correct-answer"
                      : isAnswered && alternative.letter === selectedAnswer
                        ? alternative.letter === currentQuestion.correctAlternative
                          ? "correct-answer"
                          : "incorrect-answer"
                        : ""
                  } ${isAnswered ? "answered" : ""}`}
                  onClick={() => handleSelectAnswer(alternative.letter)}
                >
                  <RadioGroupItem
                    value={alternative.letter}
                    id={`alternative-${alternative.letter}`}
                    disabled={isAnswered}
                  />
                  <Label htmlFor={`alternative-${alternative.letter}`} className="flex-1 cursor-pointer">
                    <span className="font-semibold">{alternative.letter})</span>
                    {alternative.text && <span> {parseMarkdown(alternative.text)}</span>}
                    {alternative.file && (
                      <img
                        src={alternative.file}
                        alt={`Alternativa ${alternative.letter}`}
                        className="max-w-xs h-auto mt-2 rounded"
                        style={{ display: "block" }}
                      />
                    )}
                  </Label>

                  {isAnswered && alternative.letter === currentQuestion.correctAlternative && (
                    <CheckCircle className="h-5 w-5 text-success animate-fade-in" />
                  )}

                  {isAnswered &&
                    alternative.letter === selectedAnswer &&
                    alternative.letter !== currentQuestion.correctAlternative && (
                      <XCircle className="h-5 w-5 text-destructive animate-fade-in" />
                    )}
                </div>
              ))}
            </RadioGroup>

            {isAnswered && (
              <Alert
                className={`mt-4 animate-fade-in ${
                  selectedAnswer === currentQuestion.correctAlternative
                    ? "border-success bg-success/10"
                    : "border-destructive bg-destructive/10"
                }`}
              >
                <AlertTitle
                  className={
                    selectedAnswer === currentQuestion.correctAlternative ? "text-success" : "text-destructive"
                  }
                >
                  {selectedAnswer === currentQuestion.correctAlternative
                    ? "Resposta correta! 🎉"
                    : "Resposta incorreta! 😕"}
                </AlertTitle>
                <AlertDescription>
                  {selectedAnswer === currentQuestion.correctAlternative
                    ? "Parabéns! Você acertou a questão."
                    : `A alternativa correta é a letra ${currentQuestion.correctAlternative}.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Botão para mostrar explicação quando o usuário errar */}
            {isAnswered &&
              selectedAnswer !== currentQuestion.correctAlternative &&
              currentQuestion.explanation &&
              !showExplanation && (
                <Button
                  onClick={toggleExplanation}
                  variant="outline"
                  className="mt-4 flex items-center gap-2 animate-fade-in"
                >
                  <BookOpen className="h-4 w-4" />
                  Ver explicação
                </Button>
              )}

            {/* Explicação da questão */}
            {showExplanation && currentQuestion.explanation && (
              <div className="explanation-container mt-4 animate-fade-in">
                <div className="flex items-center mb-2">
                  <Info className="h-5 w-5 text-primary mr-2" />
                  <h4 className="explanation-title">Explicação</h4>
                </div>
                <p className="explanation-content">{parseMarkdown(currentQuestion.explanation)}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <div className="flex gap-2">
              <Button onClick={handleConfirmAnswer} disabled={!selectedAnswer || isAnswered} className="button-primary">
                Confirmar resposta
              </Button>
              {/* Botão de pular questão */}
              {!isAnswered && totalRespondidas < questions.length - 1 && (
                <Button
                  onClick={handleSkipQuestion}
                  variant="outline"
                  className="flex items-center gap-1"
                  title="Pular questão"
                >
                  <SkipForward className="h-4 w-4" />
                  Pular
                </Button>
              )}
            </div>
            {isAnswered && (
              <Button onClick={handleNextQuestion} className="flex items-center gap-1 button-primary animate-fade-in">
                {totalRespondidas < questions.length - 1 ? "Próxima questão" : "Ver resultado"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}