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
  area: string
  discipline: string
  context: string
  files: string[]
  correctAlternative: string
  alternativesIntroduction: string
  alternatives: Alternative[]
  dirName?: string
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
    const { subject } = await params
    const baseDir = path.join(process.cwd(), "public")

    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ error: "Diretório de questões não encontrado" }, { status: 404 })
    }

    const allQuestions = readQuestionsRecursively(baseDir)

    // Filtro especial para inglês e espanhol: pega por disciplina, language e dirName
    const filteredQuestions = allQuestions.filter((q) => {
      // se usuário pedir área inteira
      if (["ciencias-humanas","ciencias-natureza","linguagens","matematica"].includes(subject)) {
        return q.area === subject
      }

      // Filtro especial para inglês - deve incluir apenas questões de inglês
      if (subject === "ingles") {
        const dir = (q.dirName || "").toLowerCase()
        return (
          q.discipline === "ingles" ||
          (q.language && q.language.toLowerCase() === "ingles") ||
          dir.endsWith("-ingles") || dir === "ingles"
        )
      }

      // Filtro especial para espanhol - deve incluir apenas questões de espanhol
      if (subject === "espanhol") {
        const dir = (q.dirName || "").toLowerCase()
        return (
          q.discipline === "espanhol" ||
          (q.language && q.language.toLowerCase() === "espanhol") ||
          dir.endsWith("-espanhol") || dir === "espanhol"
        )
      }

      // caso normal: disciplina exata
      return q.discipline === subject
    })

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
