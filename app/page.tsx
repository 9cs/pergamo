import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  User,
  BookOpen,
  Microscope,
  Calculator,
  FileText,
  Globe,
  Clock,
  Flag,
  Dna,
  Atom,
  Languages,
  Mountain,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import Footer from "@/components/Footer"

const areas = [
  {
  key: "ciencias-humanas",
    title: "Ciências Humanas",
    icon: <User className="h-6 w-6" />,
    color: "humanities",
    subjects: ["historia", "geografia", "filosofia", "sociologia"]
  },
  {
  key: "linguagens",
    title: "Linguagens",
    icon: <BookOpen className="h-6 w-6" />,
    color: "languages", 
    subjects: ["portugues", "literatura", "ingles", "espanhol", "educacao-fisica"]
  },
  {
  key: "ciencias-natureza",
    title: "Ciências da Natureza",
    icon: <Microscope className="h-6 w-6" />,
    color: "nature",
    subjects: ["biologia", "quimica", "fisica"]
  },
  {
  key: "matematica",
    title: "Matemática",
    icon: <Calculator className="h-6 w-6" />,
    color: "mathematics",
    subjects: ["matematica"]
  }
]

const subjects = [
  { key: "portugues", title: "Português", icon: <FileText className="h-5 w-5" />, color: "languages", count: 245 },
  { key: "literatura", title: "Literatura", icon: <BookOpen className="h-5 w-5" />, color: "languages", count: 156 },
  { key: "ingles", title: "Inglês", icon: <Languages className="h-5 w-5" />, color: "languages", count: 89 },
  { key: "espanhol", title: "Espanhol", icon: <Flag className="h-5 w-5" />, color: "languages", count: 76 },
  { key: "historia", title: "História", icon: <Clock className="h-5 w-5" />, color: "humanities", count: 198 },
  { key: "geografia", title: "Geografia", icon: <Globe className="h-5 w-5" />, color: "humanities", count: 167 },
  { key: "filosofia", title: "Filosofia", icon: <User className="h-5 w-5" />, color: "humanities", count: 134 },
  { key: "sociologia", title: "Sociologia", icon: <User className="h-5 w-5" />, color: "humanities", count: 112 },
  { key: "biologia", title: "Biologia", icon: <Dna className="h-5 w-5" />, color: "nature", count: 189 },
  { key: "quimica", title: "Química", icon: <Atom className="h-5 w-5" />, color: "nature", count: 156 },
  { key: "fisica", title: "Física", icon: <Mountain className="h-5 w-5" />, color: "nature", count: 143 },
  { key: "matematica", title: "Matemática", icon: <Calculator className="h-5 w-5" />, color: "mathematics", count: 267 }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header com gradiente */}
      <header className="w-full bg-gradient-to-r from-sky-400 via-green-300 to-blue-400 py-12 mb-0">
        <div className="container mx-auto flex flex-col items-center justify-center gap-2">
          <h1 className="text-5xl font-extrabold text-neutral-900 mb-2">Questões ENEM</h1>
          <p className="text-lg text-neutral-800 mb-2">Bem-vindo ao Simulador de Questões do ENEM</p>
          <p className="text-base text-neutral-700 mb-2">Selecione uma matéria abaixo para começar a responder questões e testar seus conhecimentos.</p>
        </div>
      </header>
      <main className="bg-[#131a24] min-h-[60vh] w-full pb-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4 text-white pt-8">Áreas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {areas.map((area) => (
              <Card
                key={area.title}
                className="group border border-border transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{
                  ['--hover-color' as any]: `hsl(var(--${area.color}))`,
                  backgroundImage: 'var(--gradient-card)',
                } as React.CSSProperties}
              >
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center bg-black/20">
                      <div className={cn(
                        `w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-300`
                      )}
                      style={{ backgroundColor: `hsl(var(--${area.color}) / 0.2)` }}
                    >
                        {React.cloneElement(area.icon, { className: 'h-6 w-6', style: { color: `hsl(var(--${area.color}))` } })}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors mb-2">
                      {area.title}
                    </h3>
                    <Link href={`/questoes/${area.key}`} tabIndex={-1} legacyBehavior passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "mt-2 w-full justify-center font-semibold transition-all duration-200",
                          "rounded-lg border-none outline-none focus:outline-none subject-btn",
                          "text-white",
                        )}
                        style={{
                          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)',
                        }}
                      >
                        Iniciar
                        <ChevronRight className="h-4 w-4 ml-2 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4 text-white">Matérias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjects.map((subject) => (
              <Card
                key={subject.key}
                className="group border border-border transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{
                  ['--hover-color' as any]: `hsl(var(--${subject.color}))`,
                  backgroundImage: 'var(--gradient-card)',
                } as React.CSSProperties}
              >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/20">
                        <div className={cn(
                          `w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300`
                        )}
                        style={{ backgroundColor: `hsl(var(--${subject.color}) / 0.2)` }}
                      >
                          {React.cloneElement(subject.icon, { className: 'h-5 w-5', style: { color: `hsl(var(--${subject.color}))` } })}
                        </div>
                      </div>
                      {/* <Badge variant="secondary" className="text-xs">{subject.count} questões</Badge> */}
                    </div>
                    <h3 className="text-lg font-bold mb-3 text-white group-hover:text-primary transition-colors">
                      {subject.title}
                    </h3>
                    <Link href={`/questoes/${subject.key}`} tabIndex={-1} legacyBehavior passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full flex items-center justify-between p-3 font-semibold transition-all duration-200",
                          "rounded-lg border-none outline-none focus:outline-none subject-btn",
                          "text-white",
                        )}
                        style={{
                          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)',
                        }}
                      >
                        Iniciar
                        <ChevronRight className="h-4 w-4 ml-2 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
            ))}
          </div>

          <Card className="mt-12 border border-border" style={{ backgroundImage: 'var(--gradient-card)' }}>
            <CardHeader>
              <CardTitle className="text-center text-white">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 max-w-2xl mx-auto">
                Este simulador permite que você pratique com questões de anos anteriores do ENEM, 
                receba feedback imediato sobre suas respostas e acompanhe seu desempenho.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
