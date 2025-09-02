"use client"

import { X, Languages, Flag, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
  isLinguagensArea?: boolean // true para área Linguagens, false para matéria Língua Estrangeira
}

export default function LanguageModal({ isOpen, onClose, isLinguagensArea = false }: LanguageModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop com blur animado */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Modal content animado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            <Link href={isLinguagensArea ? "/questoes/linguagens?lang=ingles" : "/questoes/ingles"} className="block">
              <Button
                className="w-full justify-start gap-3 h-14 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-foreground transition-all duration-200 hover:scale-[1.02]"
                onClick={onClose}
              >
                <Languages className="h-5 w-5 text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold">Inglês</div>
                  <div className="text-sm text-muted-foreground">English questions</div>
                </div>
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          >
            <Link href={isLinguagensArea ? "/questoes/linguagens?lang=espanhol" : "/questoes/espanhol"} className="block">
              <Button
                className="w-full justify-start gap-3 h-14 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-foreground transition-all duration-200 hover:scale-[1.02]"
                onClick={onClose}
              >
                <Flag className="h-5 w-5 text-orange-400" />
                <div className="text-left">
                  <div className="font-semibold">Espanhol</div>
                  <div className="text-sm text-muted-foreground">Preguntas en español</div>
                </div>
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
            className="pt-2 border-t border-border/50"
          >
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 border-border/50 hover:bg-muted/50 bg-transparent transition-all duration-200 hover:scale-[1.02]"
              onClick={onClose}
            >
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span>Voltar para o início</span>
            </Button>
          </motion.div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}