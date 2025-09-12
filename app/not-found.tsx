"use client"

import { Home, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center space-y-6 min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center gap-3 mb-2"
          >
            <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">404</h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-3"
          >
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              Página não encontrada
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-2xl leading-relaxed">
              Ops! Parece que você se perdeu no caminho para o ENEM
            </p>
            <p className="text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
              Que tal voltar para o início e continuar seus estudos?
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg h-12 px-8">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}