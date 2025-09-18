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

  const reasons = [
    "Matéria incorreta",
    "Imagem faltando",
    "Enunciado incompleto",
    "Alternativas incorretas",
    "Outro problema",
  ]

  useEffect(() => {
    // checar localStorage ao montar
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
        // trata 429 e outros erros
        if (res.status === 429) {
          toast.error(data?.error || "Muitas requisições. Tente mais tarde.")
        } else {
          toast.error(data?.error || "Erro ao enviar report.")
        }
        return
      }

      // Se o backend devolve alreadyReported = true, ainda assim marcamos local e damos mensagem de sucesso
      if (data?.alreadyReported) {
        addReportedInLocal(questionId)
        setAlreadyReported(true)
        toast.success("Questão já tinha sido reportada — obrigado!")
        setOpen(false)
        return
      }

      // sucesso real
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
        variant="outline"
        size="sm"
        className={`bg-yellow-500/20 text-yellow-400 border-0 px-3 py-1 rounded-full ${
            alreadyReported
            ? "opacity-60 pointer-events-none cursor-not-allowed"
            : "hover:bg-yellow/100"
        }`}
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
        <DialogContent className="bg-background text-white border border-white/10">
          <DialogHeader>
            <DialogTitle>Reportar questão</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {reasons.map((r) => (
              <Button
                key={r}
                disabled={loading}
                onClick={() => handleReport(r)}
                className="w-full bg-white/10 hover:bg-white/20 border-white/20"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
