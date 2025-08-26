"use client"

import React, { useState } from "react"
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
  ChevronRight,
  GraduationCap,
  Target,
  TrendingUp,
  X,
  Brush,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Footer from "@/components/Footer"
import LanguageModal from "@/components/LanguageModal"
import LanguageSelectionModal from "@/components/LanguageSelectionModal"

const areas = [
  {
    key: "ciencias-humanas",
    title: "Ciências Humanas",
    icon: <User className="h-6 w-6" />,
    color: "humanities",
    subjects: ["historia", "geografia", "filosofia", "sociologia"],
    description: "História, Geografia, Filosofia e Sociologia",
  },
  {
    key: "linguagens",
    title: "Linguagens",
    icon: <BookOpen className="h-6 w-6" />,
    color: "languages",
    subjects: ["portugues", "literatura", "lingua-estrangeira", "artes", "educacao-fisica"],
    description: "Português, Literatura, Língua Estrangeira e Artes",
  },
  {
    key: "ciencias-natureza",
    title: "Ciências da Natureza",
    icon: <Microscope className="h-6 w-6" />,
    color: "nature",
    subjects: ["biologia", "quimica", "fisica"],
    description: "Biologia, Química e Física",
  },
  {
    key: "matematica",
    title: "Matemática",
    icon: <Calculator className="h-6 w-6" />,
    color: "mathematics",
    subjects: ["matematica"],
    description: "Matemática e suas Tecnologias",
  },
]

const subjects = [
  { key: "portugues", title: "Português", icon: <FileText className="h-5 w-5" />, color: "languages", count: 245 },
  { key: "literatura", title: "Literatura", icon: <BookOpen className="h-5 w-5" />, color: "languages", count: 156 },
  { key: "lingua-estrangeira", title: "Língua Estrangeira", icon: <Languages className="h-5 w-5" />, color: "languages", count: 165 },
  { key: "artes", title: "Artes", icon: <Brush className="h-5 w-5" />, color: "languages", count: 89 },
  { key: "historia", title: "História", icon: <Clock className="h-5 w-5" />, color: "humanities", count: 198 },
  { key: "geografia", title: "Geografia", icon: <Globe className="h-5 w-5" />, color: "humanities", count: 167 },
  { key: "filosofia", title: "Filosofia", icon: <User className="h-5 w-5" />, color: "humanities", count: 134 },
  { key: "sociologia", title: "Sociologia", icon: <User className="h-5 w-5" />, color: "humanities", count: 112 },
  { key: "biologia", title: "Biologia", icon: <Dna className="h-5 w-5" />, color: "nature", count: 189 },
  { key: "quimica", title: "Química", icon: <Atom className="h-5 w-5" />, color: "nature", count: 156 },
  { key: "fisica", title: "Física", icon: <Mountain className="h-5 w-5" />, color: "nature", count: 143 },
  {
    key: "matematica",
    title: "Matemática",
    icon: <Calculator className="h-5 w-5" />,
    color: "mathematics",
    count: 267,
  },
]

export default function Home() {
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showLanguageSelectionModal, setShowLanguageSelectionModal] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)

  const handleStartStudies = (areaKey: string) => {
    // Para todas as áreas, navegar normalmente
    if (areaKey === "lingua-estrangeira") {
      setShowLanguageSelectionModal(true)
    } else {
      window.location.href = `/questoes/${areaKey}`
    }
  }

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language)
  }

  const resetLanguageFilter = () => {
    setSelectedLanguage(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative w-full hero-gradient py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white">enemfodao</h1>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 max-w-2xl leading-relaxed">
              Prepare-se para o ENEM com questões de anos anteriores
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-white/80 max-w-3xl leading-relaxed">
              Pratique com questões reais, receba feedback imediato e acompanhe seu progresso em todas as áreas do
              conhecimento.
            </p>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-8">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Target className="h-4 w-4 text-white" />
                <span className="text-white font-medium text-sm sm:text-base">2500+ Questões</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <TrendingUp className="h-4 w-4 text-white" />
                <span className="text-white font-medium text-sm sm:text-base">Feedback Imediato</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="bg-background min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <section className="mb-16 sm:mb-20">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">Áreas do Conhecimento</h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Escolha uma área para começar seus estudos
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {areas.map((area) => (
                <Card
                  key={area.title}
                  className={cn("area-card card-hover group cursor-pointer", "h-full min-h-[200px] sm:min-h-[220px]")}
                  style={
                    {
                      ["--hover-color" as any]: `hsl(var(--${area.color}))`,
                    } as React.CSSProperties
                  }
                >
                  <CardContent className="p-6 sm:p-8 h-full flex flex-col justify-between">
                    <div className="text-center mb-6">
                      <div
                        className="mx-auto mb-4 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `hsl(var(--${area.color}) / 0.15)` }}
                      >
                        {React.cloneElement(area.icon, {
                          className: "h-7 w-7 sm:h-8 sm:w-8",
                          style: { color: `hsl(var(--${area.color}))` },
                        })}
                      </div>
                      <h3 className="font-bold text-lg sm:text-xl text-foreground mb-2 transition-colors">
                        {area.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{area.description}</p>
                    </div>

                    <Button className="subject-btn w-full" size="lg" onClick={() => handleStartStudies(area.key)}>
                      Começar Estudos
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mb-16 sm:mb-20">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">Matérias Específicas</h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Pratique questões por disciplina
              </p>
              {selectedLanguage && selectedLanguage !== "all" && (
                <div className="mt-4">
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Mostrando apenas as disciplinas de Linguagens: Português, Literatura e {selectedLanguage === "ingles" ? "Inglês" : "Espanhol"}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetLanguageFilter}
                    className="mt-2"
                  >
                    Ver todas as matérias
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {subjects
                .filter(subject => {
                  // Se nenhuma linguagem foi selecionada, mostrar todas as matérias
                  if (!selectedLanguage || selectedLanguage === "all") return true;
                  
                  // Se foi selecionada uma linguagem, mostrar apenas as 3 disciplinas de linguagens
                  if (selectedLanguage === "ingles") {
                    // Mostrar português, literatura e inglês
                    return subject.key === "portugues" || subject.key === "literatura" || subject.key === "ingles";
                  }
                  
                  if (selectedLanguage === "espanhol") {
                    // Mostrar português, literatura e espanhol
                    return subject.key === "portugues" || subject.key === "literatura" || subject.key === "espanhol";
                  }
                  
                  return true;
                })
                .map((subject) => (
                <Card
                  key={subject.key}
                  className={cn("area-card card-hover group cursor-pointer", "h-full min-h-[160px] sm:min-h-[180px]")}
                  style={
                    {
                      ["--hover-color" as any]: `hsl(var(--${subject.color}))`,
                    } as React.CSSProperties
                  }
                >
                  <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-xl"
                        style={{ backgroundColor: `hsl(var(--${subject.color}) / 0.15)` }}
                      >
                        {React.cloneElement(subject.icon, {
                          className: "h-5 w-5",
                          style: { color: `hsl(var(--${subject.color}))` },
                        })}
                      </div>
                    </div>

                    <div className="flex-1 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground transition-colors">
                        {subject.title}
                      </h3>
                    </div>

                    {subject.key === "lingua-estrangeira" ? (
                      <Button 
                        className="subject-btn w-full" 
                        size="sm" 
                        onClick={() => handleStartStudies(subject.key)}
                      >
                        Praticar
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Link href={`/questoes/${subject.key}`} className="w-full">
                        <Button className="subject-btn w-full" size="sm">
                          Praticar
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card className="area-card border-border/50 bg-gradient-to-br from-card to-card/80">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl text-foreground">Como Funciona?</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-6">
                  Este simulador permite que você pratique com questões de anos anteriores do ENEM, receba feedback
                  imediato sobre suas respostas e acompanhe seu desempenho em tempo real.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground">Pratique</h4>
                    <p className="text-sm text-muted-foreground text-center">Questões reais de anos anteriores</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <h4 className="font-semibold text-foreground">Aprenda</h4>
                    <p className="text-sm text-muted-foreground text-center">Feedback imediato e explicações</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-warning" />
                    </div>
                    <h4 className="font-semibold text-foreground">Evolua</h4>
                    <p className="text-sm text-muted-foreground text-center">Acompanhe seu progresso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
      
      {/* LanguageModal removido - a seleção de língua agora é feita na página de questões */}
      <LanguageSelectionModal 
        isOpen={showLanguageSelectionModal} 
        onClose={() => setShowLanguageSelectionModal(false)} 
      />
    </div>
  )
}
