import { NextResponse } from "next/server"
import path from "path"
import { readQuestionsRecursively } from "../../utils"

// Mapeamento de área para disciplinas específicas
const areaToSubjects: Record<string, string[]> = {
  "ciencias-humanas": ["filosofia", "historia", "geografia"],
  "ciencias-natureza": ["biologia", "fisica", "quimica"],
  linguagens: ["portugues", "literatura", "ingles", "espanhol"],
}

export async function GET(
  request: Request,
  { params }: { params: { subject: string; year: string } }
) {
  try {
    const { subject, year } = params

    if (!year || isNaN(Number(year))) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 })
    }

    // Parâmetro para retornar questão aleatória
    const url = new URL(request.url)
    const random = url.searchParams.get("random") === "true"

    const baseDir = path.join(process.cwd(), "public")
    const allQuestions = readQuestionsRecursively(baseDir)

    // Filtro aprimorado para disciplinas específicas de linguagens
    const filteredQuestions = allQuestions.filter((q) => {
      if (q.year !== Number(year)) return false

      // Espanhol e Inglês: só questões com o campo language correto
      if (subject === "espanhol") return q.language === "espanhol"
      if (subject === "ingles") return q.language === "ingles"
      // Português: language null ou "portugues"
      if (subject === "portugues") return q.language === "portugues" || q.language === null
      // Literatura: discipline linguagens e language null
      if (subject === "literatura") return q.discipline === "linguagens" && q.language === null
      // Outras disciplinas específicas
      if (["filosofia", "historia", "geografia"].includes(subject)) return q.discipline === "ciencias-humanas"
      if (["biologia", "fisica", "quimica"].includes(subject)) return q.discipline === "ciencias-natureza"
      // Fallback: disciplina exata
      return q.discipline === subject
    })

    // Ordena as questões por índice
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