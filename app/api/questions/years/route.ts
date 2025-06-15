import { NextResponse } from "next/server"
import path from "path"
import { readQuestionsRecursively, getAvailableYears } from "../utils"

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "public")
    const allQuestions = readQuestionsRecursively(baseDir)
    const years = getAvailableYears(allQuestions)

    return NextResponse.json(years)
  } catch (error) {
    console.error("Erro ao carregar anos disponíveis:", error)
    return NextResponse.json({ error: "Erro ao carregar anos disponíveis" }, { status: 500 })
  }
}
