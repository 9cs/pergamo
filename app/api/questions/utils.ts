import fs from "fs"
import path from "path"


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
        
        readQuestionsRecursively(filePath, questions)
      } else if (file === "details.json") {
        
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8")
          const questionData = JSON.parse(fileContent)

          
          questionData.dirName = path.basename(path.dirname(filePath))

          
          if (questionData.files && questionData.files.length > 0) {
            const fileDir = path.dirname(filePath)
            const relativePath = path.relative(path.join(process.cwd(), "public"), fileDir)

            questionData.files = questionData.files.map((file: string) => {
              
              if (file.startsWith("http")) {
                return file
              }
              
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


export function getAvailableYears(questions: Question[]): number[] {
  const years = questions.map((q) => q.year)
  return [...new Set(years)].sort((a, b) => a - b)
}

export function getAvailableAreas(questions: Question[]): string[] {
  const areas = questions.map((q) => q.area)
  return [...new Set(areas)].filter(Boolean).sort()
} 


export function getAvailableDisciplines(questions: Question[]): string[] {
  const disciplines = questions.map((q) => q.discipline)
  return [...new Set(disciplines)].filter(Boolean).sort()
}
