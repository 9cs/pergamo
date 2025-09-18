// app/api/report-question/route.ts
import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

function capitalizeFirstLetter(str: string) {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 m"),
})

const REPORTS_KEY_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 dias

export async function POST(req: Request) {
  try {
    const ip =
      (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown")
        .split(",")[0]
        .trim()

    const { success, remaining } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: "Muitas requisições, tente mais tarde." }, { status: 429 })
    }

    const body = await req.json()
    const { questionId, subject, year, reason } = body

    if (!questionId || !reason) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const userIdentifier = ip

    const key = `reported:${questionId}`

    let country = "Desconhecido"

    if (ip !== "unknown") {
    try {
        const res = await fetch(`https://ipapi.co/${ip}/country/`)
        if (res.ok) country = (await res.text()).trim()
    } catch (err) {
        console.error("Erro ao obter país:", err)
    }
    }

    const added = await redis.sadd(key, userIdentifier)

    if (added === 0) {
      return NextResponse.json({ success: true, alreadyReported: true })
    }

    await redis.expire(key, REPORTS_KEY_TTL_SECONDS)

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 })
    }

    const flagUrl = country !== "Desconhecido"
    ? `https://flagcdn.com/16x12/${country.toLowerCase()}.png`
    : "https://i.imgur.com/placeholder.png"

    const payload = {
      username: "Pergamo | ReportBot |",
      avatar_url: "https://cdn.discordapp.com/attachments/1113994866330980442/1418094240428462131/dark.png?ex=68ccdead&is=68cb8d2d&hm=2b2202a50139283319e83d87baf8fe633bd8a9002880e7db8e99b2598b364122&",
      embeds: [
        {
          title: "🚨 Questão reportada!",
          color: 16753920,
          thumbnail: { url: "https://cdn.discordapp.com/attachments/1113994866330980442/1418094240428462131/dark.png?ex=68ccdead&is=68cb8d2d&hm=2b2202a50139283319e83d87baf8fe633bd8a9002880e7db8e99b2598b364122&" },
          fields: [
            { name: "Questão número", value: questionId, inline: true },
            { name: "Ano", value: String(year), inline: true },
            { name: "Matéria", value: capitalizeFirstLetter(subject) },
            { name: "Problema", value: reason },
          ],
          timestamp: new Date().toISOString(),
          footer: { 
            text: `País de origem: ${country}`,
            icon_url: flagUrl,
          },
        },
      ],
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro no report:", error)
    return NextResponse.json({ error: "Erro ao enviar o report" }, { status: 500 })
  }
}