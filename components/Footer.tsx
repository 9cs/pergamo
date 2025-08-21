import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ExternalLink, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-sky-500 via-green-400 to-blue-500">
      <div className="px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-2">
              <h3 className="text-lg font-bold text-black">
                ENEM Prep
              </h3>
            </div>
            <p className="text-black text-sm text-center font-semibold">
              © 2025 - Desenvolvido por <span className="font-bold text-black">Dantton Lavigne</span>
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full border-black/25 bg-grey/35 text-black hover:bg-white hover:text-indigo-700 transition-all duration-300"
              asChild
            >
              <Link
                href="https://dantton.online"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center"
              >
                <ExternalLink className="h-6 w-6" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full border-black/25 bg-grey/35 text-black hover:bg-white hover:text-indigo-700 transition-all duration-300"
              asChild
            >
              <Link
                href="https://github.com/9cs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center"
              >
                <Github className="h-6 w-6" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}