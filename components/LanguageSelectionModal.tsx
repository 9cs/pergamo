"use client"

import { X, Languages, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface LanguageSelectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LanguageSelectionModal({ isOpen, onClose }: LanguageSelectionModalProps) {
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
          <h3 className="text-xl font-bold text-foreground">Escolha a língua estrangeira</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-6 text-center">Selecione qual língua você gostaria de praticar:</p>

        <div className="space-y-3">
          <Link href="/questoes/ingles" className="block">
            <Button
              className="w-full justify-start gap-3 h-14 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-foreground"
              onClick={onClose}
            >
              <Languages className="h-5 w-5 text-blue-400" />
              <div className="text-left">
                <div className="font-semibold">Inglês</div>
                <div className="text-sm text-muted-foreground">English questions</div>
              </div>
            </Button>
          </Link>

          <Link href="/questoes/espanhol" className="block">
            <Button
              className="w-full justify-start gap-3 h-14 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-foreground"
              onClick={onClose}
            >
              <Flag className="h-5 w-5 text-orange-400" />
              <div className="text-left">
                <div className="font-semibold">Espanhol</div>
                <div className="text-sm text-muted-foreground">Preguntas en español</div>
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}