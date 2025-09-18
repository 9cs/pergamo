import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"


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


const questionsCache = new Map<string, Question[]>()


function readQuestionsRecursively(dir: string, questions: Question[] = []): Question[] {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      readQuestionsRecursively(filePath, questions)
    } else if (file === "details.json") {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const questionData = JSON.parse(fileContent)
        questionData.dirName = path.basename(path.dirname(filePath))
        questions.push(questionData)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Erro ao ler arquivo ${filePath}:`, error)
        }
      }
    }
  }

  return questions
}


function filterQuestionsByDiscipline(questions: Question[], discipline: string): Question[] {
  if (discipline === "ingles") {
    return questions.filter((q) => {
      const dir = (q.dirName || "").toLowerCase()
      
      return (
        (q.language && q.language.toLowerCase() === "ingles") ||
        q.discipline === "ingles" ||
        dir.endsWith("-ingles") || dir === "ingles"
      )
    })
  }

  if (discipline === "espanhol") {
    return questions.filter((q) => {
      const dir = (q.dirName || "").toLowerCase()
      
      return (
        (q.language && q.language.toLowerCase() === "espanhol") ||
        q.discipline === "espanhol" ||
        dir.endsWith("-espanhol") || dir === "espanhol"
      )
    })
  }

  return questions.filter((q) => q.discipline === discipline)
}

export async function POST(request: Request) {
  try {
    const { subjects, offset = 0, limit = 50 } = await request.json()
    
    if (!Array.isArray(subjects)) {
      return NextResponse.json({ error: "subjects deve ser um array" }, { status: 400 })
    }

    const baseDir = path.join(process.cwd(), "public")
    
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ error: "Diretório de questões não encontrado" }, { status: 404 })
    }

    
    let allQuestions: Question[]
    if (questionsCache.has("all")) {
      allQuestions = questionsCache.get("all")!
    } else {
      allQuestions = readQuestionsRecursively(baseDir)
      questionsCache.set("all", allQuestions)
    }

    const result: Record<string, { questions: Question[], total: number }> = {}

    
    for (const subject of subjects) {
      const cacheKey = `${subject}-all`
      let filteredQuestions: Question[]
      
      if (questionsCache.has(cacheKey)) {
        filteredQuestions = questionsCache.get(cacheKey)!
      } else {
        filteredQuestions = filterQuestionsByDiscipline(allQuestions, subject)
        filteredQuestions.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          return a.index - b.index
        })
        questionsCache.set(cacheKey, filteredQuestions)
      }

      
      const paginatedQuestions = filteredQuestions.slice(offset, offset + limit)
      
      result[subject] = {
        questions: paginatedQuestions,
        total: filteredQuestions.length
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Erro ao carregar questões progressivamente:", error)
    }
    return NextResponse.json({ error: "Erro ao carregar questões" }, { status: 500 })
  }
}
