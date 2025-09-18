import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github, Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="relative hero-gradient overflow-hidden">
    <div className="absolute inset-0 bg-black/80" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 animate-pulse"></div>
        <div className="absolute inset-0 hero-gradient opacity-50"></div>
      </div>

      <div className="relative px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex items-center gap-2 text-slate-300">
              <span>Desenvolvido por</span>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Dantton Lavigne
              </span>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-xl border-slate-700 bg-slate-800/50 backdrop-blur-sm text-slate-300 hover:bg-card hover:border-blue-500 hover:text-white hover:scale-110 transition-all duration-300 group"
                asChild
              >
                <Link
                  href="https://dantton.site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-xl border-slate-700 bg-slate-800/50 backdrop-blur-sm text-slate-300 hover:bg-card hover:border-purple-500 hover:text-white hover:scale-110 transition-all duration-300 group"
                asChild
              >
                <Link
                  href="https://github.com/9cs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <Github className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                </Link>
              </Button>
            </div>
            <div className="text-sm text-slate-400">
              <p>© 2025 - Todos os direitos reservados</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
