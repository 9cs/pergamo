"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface ReportButtonProps {
  questionId: string
  subject?: string
  year?: number
}

const STORAGE_KEY = "reported_questions"

function hasReportedInLocal(questionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const arr: string[] = JSON.parse(raw)
    return arr.includes(questionId)
  } catch {
    return false
  }
}

function addReportedInLocal(questionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    if (!arr.includes(questionId)) {
      arr.push(questionId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
    }
  } catch {
    // ignore
  }
}

export default function ReportButton({ questionId, subject, year }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)

  const reasons = [
    "Matéria incorreta",
    "Imagem faltando",
    "Enunciado incompleto",
    "Alternativas incorretas",
    "Outro problema",
  ]

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAlreadyReported(hasReportedInLocal(questionId))
    }
  }, [questionId])

  const handleReport = async (reason: string) => {
    if (alreadyReported) {
      toast.success("Questão já reportada — obrigado!")
      setOpen(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/report-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          subject,
          year,
          reason,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          toast.error(data?.error || "Muitas requisições. Tente mais tarde.")
        } else {
          toast.error(data?.error || "Erro ao enviar report.")
        }
        return
      }

      if (data?.alreadyReported) {
        addReportedInLocal(questionId)
        setAlreadyReported(true)
        toast.success("Questão já tinha sido reportada — obrigado!")
        setOpen(false)
        return
      }

      addReportedInLocal(questionId)
      setAlreadyReported(true)
      toast.success("Report enviado com sucesso! Obrigado 🙏")
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error("Erro ao enviar o report.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        className={`
          bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full
          transition-transform duration-200 ease-out
          ${alreadyReported 
            ? "opacity-50 pointer-events-none hover:scale-100 hover:bg-yellow-500/20 cursor-not-allowed"
            : "hover:scale-105 hover:bg-yellow-500/25"
          }
        `}
        onClick={() => {
          if (alreadyReported) {
            toast.success("Questão já reportada — obrigado!")
            return
          }
          setOpen(true)
        }}
        aria-pressed={open}
      >
        <AlertTriangle className="h-4 w-4 mr-1" />
        Reportar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background/80 backdrop-blur-md text-white border border-white/10">
          <DialogHeader>
            <DialogTitle>Reportar questão</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {reasons.map((r) => (
              <Button
                key={r}
                disabled={loading}
                onClick={() => setSelectedReason(r)}
                className={`w-full border-white/20 ${
                  selectedReason === r
                    ? "bg-neutral-100/95 hover:bg-neutral-100 text-neutral-900 border-2 border-bg shadow-lg transition-transform duration-200 ease-out hover:scale-105"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {r}
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-slate-300 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedReason && handleReport(selectedReason)}
              disabled={loading || !selectedReason}
              className="w-full sm:w-auto bg-white hover:bg-white text-neutral-900 border-0 shadow-lg transition-transform duration-200 ease-out hover:scale-105"
            >
              Enviar Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
