import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Interface para a estrutura das questões
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
  discipline: string
  context: string
  files: string[]
  correctAlternative: string
  alternativesIntroduction: string
  alternatives: Alternative[]
  dirName?: string // <-- Adicionado
}

// Função para ler recursivamente todos os arquivos details.json
function readQuestionsRecursively(dir: string, questions: Question[] = []): Question[] {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Se for um diretório, faz a mesma mesma função
      readQuestionsRecursively(filePath, questions)
    } else if (file === "details.json") {
      // Se for um details.json, acrescenta às questões
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const questionData = JSON.parse(fileContent)
        // Adiciona o nome da pasta (ex: "94-espanhol", "94-ingles", "94")
        questionData.dirName = path.basename(path.dirname(filePath))
        questions.push(questionData)
      } catch (error) {
        console.error(`Erro ao ler arquivo ${filePath}:`, error)
      }
    }
  }

  return questions
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subject: string }> },
) {
  try {
    // Aguardando os parâmetros
    const { subject } = await params;

    const baseDir = path.join(process.cwd(), "public")

    // Verifica se o diretório existe
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ error: "Diretório de questões não encontrado" }, { status: 404 })
    }

    // Lê todas as questões recursivamente
    const allQuestions = readQuestionsRecursively(baseDir)

    // Filtra as questões pela disciplina e pelo nome da pasta
    const filteredQuestions = allQuestions.filter((q) => {
      // Espanhol: pasta termina com -espanhol
      if (subject === "espanhol") return q.dirName?.endsWith("-espanhol")
      // Inglês: pasta termina com -ingles
      if (subject === "ingles") return q.dirName?.endsWith("-ingles")
      // Português: pasta NÃO termina com -espanhol nem -ingles
      if (subject === "portugues") return (
        !q.dirName?.endsWith("-espanhol") &&
        !q.dirName?.endsWith("-ingles")
      )
      // Literatura: discipline linguagens e language null
      if (subject === "literatura") return q.discipline === "linguagens" && q.language === null
      // Outras disciplinas específicas
      if (["filosofia", "historia", "geografia"].includes(subject)) return q.discipline === "ciencias-humanas"
      if (["biologia", "fisica", "quimica"].includes(subject)) return q.discipline === "ciencias-natureza"
      // Fallback: disciplina exata
      return q.discipline === subject
    })

    // Ordena as questões por ano e depois pelo index
    filteredQuestions.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.index - b.index
    })

    return NextResponse.json(filteredQuestions)
  } catch (error) {
    console.error("Erro ao carregar questões.", error)
    return NextResponse.json({ error: "Erro ao carregar questões" }, { status: 500 })
  }
}