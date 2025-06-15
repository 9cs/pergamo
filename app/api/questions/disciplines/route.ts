import { NextResponse } from "next/server"
import path from "path"
import { readQuestionsRecursively, getAvailableDisciplines } from "../utils"

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "public")
    const allQuestions = readQuestionsRecursively(baseDir)
    const disciplines = getAvailableDisciplines(allQuestions)

    return NextResponse.json(disciplines)
  } catch (error) {
    console.error("Erro ao carregar disciplinas disponíveis:", error)
    return NextResponse.json({ error: "Erro ao carregar disciplinas disponíveis" }, { status: 500 })
  }
}
