// app/api/report-question/route.ts
import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const yellowTones = [
  "#FFF9C4", "#FFF59D", "#FFF176", "#FFEE58", "#FFEB3B",
  "#FDD835", "#FBC02D", "#F9A825", "#F57F17", "#FFC107",
  "#FFB300", "#FFA000", "#FF8F00", "#FF6F00", "#FFD600"
];

function getRandomYellow(): string {
  const index = Math.floor(Math.random() * yellowTones.length);
  return yellowTones[index];
}

function capitalizeFirstLetter(str: string) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 m"),
})

const REPORTS_KEY_TTL_SECONDS = 7 * 24 * 60 * 60

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export async function POST(req: Request) {
  try {
    const getClientIp = (req: Request) => {
      const forwarded = req.headers.get("x-forwarded-for")
      if (!forwarded) return "unknown"
      return forwarded.split(",")[0].trim()
    }

    let ip = getClientIp(req)
    if (!ip || ip === "::1" || ip === "127.0.0.1") ip = "unknown"

    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: "Muitas requisições, tente mais tarde." }, { status: 429 })
    }

    const body = await req.json()
    const { questionId, subject, year, index, reason } = body
    if (!questionId || !reason) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const userIdentifier = ip
    const key = `reported:${year}-${subject}-${index}`

    const alreadyReported = await redis.sismember(key, userIdentifier)
    if (alreadyReported) {
      return NextResponse.json({ success: true, alreadyReported: true })
    }
    await redis.sadd(key, userIdentifier)

    const ttl = await redis.ttl(key)
    if (ttl === -1) {
      await redis.expire(key, REPORTS_KEY_TTL_SECONDS)
    }

    let country = "Desconhecido"
    let countryCode = "BR"

    if (ip !== "unknown") {
      try {
        const res = await fetch(`https://ipwhois.app/json/${ip}`)
        if (res.ok) {
          const data = await res.json()
          country = data.country || "Desconhecido"
          countryCode = data.country_code || "BR"
        }
      } catch (err) {
        console.error("Erro ao obter país:", err)
      }
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 })
    }

    const flagUrl =
      country !== "Desconhecido"
        ? `https://flagcdn.com/16x12/${countryCode.toLowerCase()}.png`
        : "https://i.imgur.com/placeholder.png"

    const warningColor = hexToDecimal(getRandomYellow());
        
    const payload = {
      username: "Pergamo | ReportBot |",
      avatar_url:
        "https://cdn.discordapp.com/attachments/1113994866330980442/1418132044944244899/follow_me_on_ig_valenwav.jpeg",
      embeds: [
        {
          title: "🚨 Questão reportada!",
          color: warningColor,
          thumbnail: {
            url: "https://cdn.discordapp.com/attachments/1113994866330980442/1418094240428462131/dark.png",
          },
          fields: [
            { name: "Ano", value: String(year), inline: true },
            { name: "Número", value: index, inline: true },
            { name: "Matéria", value: capitalizeFirstLetter(subject) },
            { name: "Problema", value: reason },
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: `Origem: ${country}`,
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