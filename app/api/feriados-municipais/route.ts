import { NextRequest, NextResponse } from 'next/server'

const XOR_KEY = 'AFDsa%1!!2341R%#!$$'

function decode(b64: string): string {
  const raw = Buffer.from(b64.trim(), 'base64')
  const key = Buffer.from(XOR_KEY)
  return Buffer.from(raw.map((b, i) => b ^ key[i % key.length])).toString('utf-8')
}

function normalizeCity(city: string): string {
  return city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

function parseHolidays(xml: string): { date: string; name: string }[] {
  const results: { date: string; name: string }[] = []
  const re = /<event>([\s\S]*?)<\/event>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const e = m[1]
    const date = e.match(/<date>(.*?)<\/date>/)?.[1]?.trim() ?? ''
    const name = e.match(/<name>(.*?)<\/name>/)?.[1]?.trim() ?? ''
    const tc = parseInt(e.match(/<type_code>(.*?)<\/type_code>/)?.[1] ?? '0')
    if ((tc === 2 || tc === 3) && date && name) {
      const [dd, mm, yyyy] = date.split('/')
      results.push({ date: `${yyyy}-${mm}-${dd}`, name })
    }
  }
  return results
}

export async function GET(req: NextRequest) {
  const { ano, estado, cidade } = Object.fromEntries(req.nextUrl.searchParams)
  if (!ano || !estado || !cidade) return NextResponse.json([], { status: 400 })
  const url = `https://calendario.com.br/api/data.php?ano=${ano}&estado=${estado}&cidade=${normalizeCity(cidade)}`
  const res = await fetch(url, { cache: 'no-store' })
  const b64 = await res.text()
  const xml = decode(b64)
  return NextResponse.json(parseHolidays(xml))
}
