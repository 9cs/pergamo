import fs from "fs"
import path from "path"

// Interface para a estrutura das questões
export interface Alternative {
  letter: string
  text: string
  file: string | null
  isCorrect: boolean
}

export interface Question {
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
export function readQuestionsRecursively(dir: string, questions: Question[] = []): Question[] {
  try {
    if (!fs.existsSync(dir)) {
      console.error(`Diretório não encontrado: ${dir}`)
      return questions
    }

    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        // Se for um diretório, chama a função recursivamente
        readQuestionsRecursively(filePath, questions)
      } else if (file === "details.json") {
        // Se for um arquivo details.json, lê e adiciona à lista de questões
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8")
          const questionData = JSON.parse(fileContent)

          // Adiciona o nome da pasta (ex: "94-espanhol", "94-ingles", "94")
          questionData.dirName = path.basename(path.dirname(filePath))

          // Adiciona o caminho base para os arquivos de imagem, se existirem
          if (questionData.files && questionData.files.length > 0) {
            const fileDir = path.dirname(filePath)
            const relativePath = path.relative(path.join(process.cwd(), "public"), fileDir)

            questionData.files = questionData.files.map((file: string) => {
              // Se o arquivo já for uma URL completa, mantém como está
              if (file.startsWith("http")) {
                return file
              }
              // Caso contrário, constrói o caminho relativo
              return `/${relativePath}/${path.basename(file)}`
            })
          }

          questions.push(questionData)
        } catch (error) {
          console.error(`Erro ao ler arquivo ${filePath}:`, error)
        }
      }
    }
  } catch (error) {
    console.error(`Erro ao ler diretório ${dir}:`, error)
  }
  return questions
}

// Função para obter anos disponíveis
export function getAvailableYears(questions: Question[]): number[] {
  const years = questions.map((q) => q.year)
  return [...new Set(years)].sort((a, b) => a - b)
}

export function getAvailableAreas(questions: Question[]): string[] {
  const areas = questions.map((q) => q.area)
  return [...new Set(areas)].filter(Boolean).sort()
} 

// Função para obter disciplinas disponíveis
export function getAvailableDisciplines(questions: Question[]): string[] {
  const disciplines = questions.map((q) => q.discipline)
  return [...new Set(disciplines)].filter(Boolean).sort()
}
