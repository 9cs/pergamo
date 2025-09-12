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

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error("GROQ_API_KEY não configurada no Vercel")
      return NextResponse.json({ 
        error: "Serviço de explicação temporariamente indisponível. Configure a chave da API no Vercel." 
      }, { status: 500 })
    }

    const correctAlternative = question.alternatives.find(alt => alt.isCorrect)
    const userAlternative = question.alternatives.find(alt => alt.letter === userAnswer)

    if (!correctAlternative || !userAlternative) {
      return NextResponse.json({ error: "Alternativas não encontradas" }, { status: 400 })
    }

    const buildAssetInfo = (files: string[], prefix: string) => {
      if (!files || files.length === 0) return ""
      return `\n${prefix} IMAGENS:\n${files.map(file => `- ${file}`).join('\n')}`
    }

    const buildAlternativeAssetInfo = (alternative: Alternative, prefix: string) => {
      if (!alternative.file) return ""
      return `\n${prefix} IMAGEM: ${alternative.file}`
    }

    const hasImageAlternatives = question.alternatives.some(alt => alt.text === null && alt.file !== null)
    
    const buildImageAlternativesDescription = () => {
      if (!hasImageAlternatives) return ""
      
      return `\n\nIMPORTANTE: Esta questão tem alternativas baseadas em imagens. As alternativas são:
${question.alternatives.map(alt => 
  `- Alternativa ${alt.letter}: ${alt.file ? 'Imagem disponível' : 'Sem imagem'} ${alt.isCorrect ? '(CORRETA)' : '(incorreta)'}`
).join('\n')}

A questão solicita que o estudante analise as imagens das alternativas e escolha a que melhor responde ao enunciado.`
    }

    const prompt = `Você é um professor especialista em questões do ENEM. Explique de forma clara e direta o erro do estudante, falando diretamente com ele.

ENUNCIADO:
${question.title}

${question.context ? `CONTEXTO:\n${question.context}\n` : ''}${buildAssetInfo(question.files, "ENUNCIADO")}

${buildImageAlternativesDescription()}

ALTERNATIVA CORRETA: ${correctAlternative.letter}) ${correctAlternative.text || 'Imagem (alternativa baseada em imagem)'}${buildAlternativeAssetInfo(correctAlternative, "ALTERNATIVA CORRETA")}

ALTERNATIVA ESCOLHIDA (INCORRETA): ${userAlternative.letter}) ${userAlternative.text || 'Imagem (alternativa baseada em imagem)'}${buildAlternativeAssetInfo(userAlternative, "ALTERNATIVA ESCOLHIDA")}

INSTRUÇÕES:
- Fale diretamente com o estudante, como se estivesse explicando para ele em uma conversa.
- Se o enunciado estiver em inglês, use português para responder. Somos brasileiros.
- Não precisa ficar falando "estudante", fale como se estivesse conversando com ele.
- Explique por que a resposta escolhida pelo estudante está errada
- Mostre por que a resposta correta é a melhor opção
- Foque no conceito principal que o estudante precisa entender, sem se extender muito.
- Use linguagem acessível para estudantes do ensino médio.
- Seja direto e didático, como um professor conversando com o estudante.
- Se houver imagens mencionadas, considere que elas contêm informações importantes para a resolução
- Use formatação simples: **texto importante** para destacar conceitos chave
- ${hasImageAlternatives ? 'IMPORTANTE: Esta questão é baseada em imagens. Explique que o estudante precisa analisar as imagens das alternativas para encontrar a resposta correta. Não mencione URLs específicas, mas explique o conceito por trás da escolha correta.' : ''}

EXPLICAÇÃO:`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Groq API response status:', response.status)
      console.log('Groq API response headers:', Object.fromEntries(response.headers.entries()))
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na API do Groq:', response.status, response.statusText, errorText)
      
      if (response.status === 429) {
        return NextResponse.json({ 
          error: "RATE_LIMIT",
          message: "Muitas solicitações. Aguarde alguns segundos e tente novamente."
        }, { status: 429 })
      }
      
      return NextResponse.json({ 
        error: "Erro ao gerar explicação. Tente novamente em alguns instantes." 
      }, { status: 500 })
    }

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
    console.error('Erro ao gerar explicação:', error)
    return NextResponse.json({ 
      error: "Erro interno do servidor. Tente novamente." 
    }, { status: 500 })
  }
}
