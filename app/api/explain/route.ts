import { NextResponse } from "next/server"

interface Alternative {
  letter: string
  text: string
  file: string | null
  isCorrect: boolean
}

interface Question {
  title: string
  index: number
  year: number
  language: string | null
  area: string
  discipline: string
  context: string
  files: string[]
  correctAlternative: string
  alternativesIntroduction: string
  alternatives: Alternative[]
  dirName?: string
}

export async function POST(request: Request) {
  try {
    const { question, userAnswer }: { question: Question; userAnswer: string } = await request.json()
    
    if (!question || !userAnswer) {
      return NextResponse.json({ error: "Questão ou resposta do usuário não fornecida" }, { status: 400 })
    }

    // Verificar se a API key está configurada
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.error("OPENROUTER_API_KEY não configurada")
      }
      return NextResponse.json({ error: "Serviço de explicação não disponível" }, { status: 500 })
    }

    // Encontrar as alternativas correta e incorreta
    const correctAlternative = question.alternatives.find(alt => alt.isCorrect)
    const userAlternative = question.alternatives.find(alt => alt.letter === userAnswer)

    if (!correctAlternative || !userAlternative) {
      return NextResponse.json({ error: "Alternativas não encontradas" }, { status: 400 })
    }

    // Construir informações sobre assets/imagens
    const buildAssetInfo = (files: string[], prefix: string) => {
      if (!files || files.length === 0) return ""
      return `\n${prefix} IMAGENS:\n${files.map(file => `- ${file}`).join('\n')}`
    }

    const buildAlternativeAssetInfo = (alternative: Alternative, prefix: string) => {
      if (!alternative.file) return ""
      return `\n${prefix} IMAGEM: ${alternative.file}`
    }

    const prompt = `Você é um professor especialista em questões do ENEM. Explique de forma clara e direta o erro do estudante, falando diretamente com ele.

ENUNCIADO:
${question.title}

${question.context ? `CONTEXTO:\n${question.context}\n` : ''}${buildAssetInfo(question.files, "ENUNCIADO")}

ALTERNATIVA CORRETA: ${correctAlternative.letter}) ${correctAlternative.text}${buildAlternativeAssetInfo(correctAlternative, "ALTERNATIVA CORRETA")}

ALTERNATIVA ESCOLHIDA (INCORRETA): ${userAlternative.letter}) ${userAlternative.text}${buildAlternativeAssetInfo(userAlternative, "ALTERNATIVA ESCOLHIDA")}

INSTRUÇÕES:
- Fale diretamente com o estudante usando "você" e "sua resposta"
- Explique por que a resposta escolhida está errada
- Mostre por que a resposta correta é a melhor opção
- Foque no conceito principal que o estudante precisa entender
- Use linguagem acessível para estudantes do ensino médio
- Seja direto e didático, como um professor conversando
- Se houver imagens mencionadas, considere que elas contêm informações importantes para a resolução
- Use formatação simples: **texto importante** para destacar conceitos chave
- Máximo de 250 palavras

EXPLICAÇÃO:`

    // Fazer a requisição para o OpenRouter com streaming
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Pergamo - Explicações ENEM',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
        top_p: 0.9,
        stream: true,
      }),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('OpenRouter response status:', response.status)
      console.log('OpenRouter response headers:', Object.fromEntries(response.headers.entries()))
    }

    if (!response.ok) {
      const errorText = await response.text()
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro na API do OpenRouter:', response.status, response.statusText, errorText)
      }
      return NextResponse.json({ error: "Erro ao gerar explicação" }, { status: 500 })
    }

    // Configurar streaming response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        function pump(): Promise<void> {
          return reader!.read().then(({ done, value }) => {
            if (done) {
              controller.close()
              return
            }

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch (e) {
                  // Ignorar linhas inválidas
                }
              }
            }

            return pump()
          })
        }

        return pump()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao gerar explicação:', error)
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
