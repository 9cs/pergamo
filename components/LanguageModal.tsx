"use client"

import { X, Languages, Flag, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
  onLanguageSelect: (language: string) => void
}

export default function LanguageModal({ isOpen, onClose, onLanguageSelect }: LanguageModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop com blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Escolha o idioma</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-6 text-center">Selecione qual idioma você gostaria de praticar:</p>

        <div className="space-y-3">
          <Button
            className="w-full justify-start gap-3 h-14 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 !border-4 !border-blue-500 text-foreground"
            onClick={() => {
              onLanguageSelect("ingles");
              onClose();
            }}
          variant="bordered">
            <Languages className="h-5 w-5 text-blue-400" />
            <div className="text-left">
              <div className="font-semibold">Inglês</div>
              <div className="text-sm text-muted-foreground">English questions</div>
            </div>
          </Button>

          <Button
            className="w-full justify-start gap-3 h-14 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/30 hover:to-red-600/30 !border-4 !border-orange-500 text-foreground"
            onClick={() => {
              onLanguageSelect("espanhol");
              onClose();
            }}
          variant="bordered">
            <Flag className="h-5 w-5 text-orange-400" />
            <div className="text-left">
              <div className="font-semibold">Espanhol</div>
              <div className="text-sm text-muted-foreground">Preguntas en español</div>
            </div>
          </Button>

          <div className="pt-2 border-t border-border/50">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 border-border/50 hover:bg-muted/50 bg-transparent"
              onClick={() => {
                onLanguageSelect("all");
                onClose();
              }}
            >
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span>Todas as matérias de Linguagens</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}