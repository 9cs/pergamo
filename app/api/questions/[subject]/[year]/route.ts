import { NextResponse } from "next/server"
import path from "path"
import { readQuestionsRecursively } from "../../utils"

export async function GET(
  request: Request,
  { params }: { params: { subject: string; year: string } }
) {
  try {
    const { subject, year } = params

    if (!year || isNaN(Number(year))) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 })
    }

    const url = new URL(request.url)
    const random = url.searchParams.get("random") === "true"

    const baseDir = path.join(process.cwd(), "public")
    const allQuestions = readQuestionsRecursively(baseDir)

    
    const filteredQuestions = allQuestions.filter((q) => {
      if (q.year !== Number(year)) return false

      
      if (["ciencias-humanas", "ciencias-natureza", "linguagens", "matematica"].includes(subject)) {
        return q.area === subject
      }

      
      return q.discipline === subject
    })

    filteredQuestions.sort((a, b) => a.index - b.index)

    if (filteredQuestions.length === 0) {
      return NextResponse.json({ error: "Nenhuma questão encontrada" }, { status: 404 })
    }

    if (random) {
      const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)]
      return NextResponse.json(question)
    }

    return NextResponse.json(filteredQuestions)
  } catch (error) {
    console.error("Erro ao carregar questões.", error)
    return NextResponse.json({ error: "Erro ao carregar questões" }, { status: 500 })
  }
}
