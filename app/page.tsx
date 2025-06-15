import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowRight } from "lucide-react"

const mainSubjects = [
  { id: "ciencias-humanas", name: "Ciências Humanas", icon: "🧠" },
  { id: "ciencias-natureza", name: "Ciências da Natureza", icon: "🔬" },
  { id: "linguagens", name: "Linguagens", icon: "📝" },
  { id: "matematica", name: "Matemática", icon: "🔢" },
]

const subSubjects = [
  { id: "portugues", name: "Português", icon: "📚" },
  { id: "literatura", name: "Literatura", icon: "📖" },
  { id: "historia", name: "História", icon: "📜" },
  { id: "geografia", name: "Geografia", icon: "🌎" },
  { id: "filosofia", name: "Filosofia", icon: "🤔" },
  { id: "ingles", name: "Inglês", icon: "🇬🇧" },
  { id: "espanhol", name: "Espanhol", icon: "🇪🇸" },
  { id: "biologia", name: "Biologia", icon: "🧬" },
  { id: "fisica", name: "Física", icon: "⚛️" },
  { id: "quimica", name: "Química", icon: "⚗️" },
]

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-200 tracking-tight">
          Questões ENEM
        </h1>
        <ModeToggle />
      </div>

      <Card className="mb-8 border-2 border-neutral-200 dark:border-neutral-800 shadow-md animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl text-neutral-700 dark:text-neutral-300">
            Bem-vindo ao Simulador de Questões do ENEM
          </CardTitle>
          <CardDescription className="text-lg text-neutral-600 dark:text-neutral-400">
            Selecione uma matéria abaixo para começar a responder questões e testar seus conhecimentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-neutral-600 dark:text-neutral-400">
            Este simulador permite que você pratique com questões de anos anteriores do ENEM, receba feedback imediato
            sobre suas respostas e acompanhe seu desempenho.
          </p>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-semibold mb-4 text-neutral-700 dark:text-neutral-300 animate-fade-in">
        Áreas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {mainSubjects.map((subject) => (
          <Link
            href={`/questoes/${subject.id}`}
            key={subject.id}
            aria-label={`Ir para questões de ${subject.name}`}
            tabIndex={0}
          >
            <Card
              className="h-full subject-card bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-800 hover:border-primary dark:hover:border-primary focus-within:ring-2 focus-within:ring-primary/60 transition-all duration-200 shadow-sm hover:shadow-lg scale-100 hover:scale-[1.03]"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="subject-icon text-2xl">{subject.icon}</span>
                  <span>{subject.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full button-primary bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300 flex items-center justify-center gap-2"
                  tabIndex={-1}
                >
                  Iniciar <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-neutral-700 dark:text-neutral-300 animate-fade-in">
        Matérias
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subSubjects.map((subject) => (
          <Link
            href={`/questoes/${subject.id}`}
            key={subject.id}
            aria-label={`Ir para questões de ${subject.name}`}
            tabIndex={0}
          >
            <Card
              className="h-full subject-card bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-800 hover:border-primary dark:hover:border-primary focus-within:ring-2 focus-within:ring-primary/60 transition-all duration-200 shadow-sm hover:shadow-lg scale-100 hover:scale-[1.03]"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="subject-icon text-2xl">{subject.icon}</span>
                  <span>{subject.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full button-primary bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300 flex items-center justify-center gap-2"
                  tabIndex={-1}
                >
                  Iniciar <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}