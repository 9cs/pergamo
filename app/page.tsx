import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowRight, Brain, Microscope, Pen, BookOpen, Book, Scroll, Globe, MessageCircle, Flag, Layers, Activity, Hash, Atom, FlaskConical } from "lucide-react"
import React from "react"

const iconSize = 24

const mainSubjects = [
  { id: "ciencias-humanas", name: "Ciências Humanas", icon: <Brain size={iconSize} /> },
  { id: "linguagens", name: "Linguagens", icon: <Pen size={iconSize} /> },
  { id: "ciencias-natureza", name: "Ciências da Natureza", icon: <Microscope size={iconSize} /> },
  { id: "matematica", name: "Matemática", icon: <Hash size={iconSize} /> },
]

const subSubjects = [
  { id: "portugues", name: "Português", icon: <BookOpen size={iconSize} /> },
  { id: "literatura", name: "Literatura", icon: <Book size={iconSize} /> },
  { id: "historia", name: "História", icon: <Scroll size={iconSize} /> },
  { id: "geografia", name: "Geografia", icon: <Globe size={iconSize} /> },
  { id: "filosofia", name: "Filosofia", icon: <MessageCircle size={iconSize} /> },
  { id: "ingles", name: "Inglês", icon: <Flag size={iconSize} /> },
  { id: "espanhol", name: "Espanhol", icon: <Flag size={iconSize} /> },
  { id: "biologia", name: "Biologia", icon: <Layers size={iconSize} /> },
  { id: "matematica", name: "Matemática", icon: <Hash size={iconSize} /> },
  { id: "fisica", name: "Física", icon: <Atom size={iconSize} /> },
  { id: "quimica", name: "Química", icon: <FlaskConical size={iconSize} /> },
];

const subjectColors: Record<string, string> = {
  "ciencias-humanas": "#8B5CF6",
  "linguagens": "#F59E0B",
  "ciencias-natureza": "#14B8A6",
  "matematica": "#F97316",
  "portugues": "#F59E0B",
  "literatura": "#EF4444",
  "historia": "#8B5CF6",
  "geografia": "#3B82F6",
  "filosofia": "#10B981",
  "ingles": "#2563EB",
  "espanhol": "#DC2626",
  "biologia": "#14B8A6",
  "fisica": "#A855F7",
  "quimica": "#F43F5E",
}

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
        {mainSubjects.map((subject) => {
          const areaColor = subjectColors[subject.id] || undefined;
          return (
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
                    <span className="subject-icon text-2xl">
                      {React.cloneElement(subject.icon, { color: areaColor })}
                    </span>
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
          )
        })}
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-neutral-700 dark:text-neutral-300 animate-fade-in">
        Matérias
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subSubjects.map((subject) => {
          const color = subjectColors[subject.id] || undefined;
          return (
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
                    <span className="subject-icon text-2xl">
                      {React.cloneElement(subject.icon, { color })}
                    </span>
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
          )
        })}
      </div>
    </main>
  )
}