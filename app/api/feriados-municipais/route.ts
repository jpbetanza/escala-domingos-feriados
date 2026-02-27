import { NextRequest, NextResponse } from 'next/server'

const XOR_KEY = 'AFDsa%1!!2341R%#!$$'

function decode(b64: string): string {
  const raw = Buffer.from(b64.trim(), 'base64')
  const key = Buffer.from(XOR_KEY)
  return Buffer.from(raw.map((b, i) => b ^ key[i % key.length])).toString('utf-8')
}

function normalizeCity(city: string): string {
  return city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/ /g, '+')
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
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/plain, */*',
      'Referer': 'https://calendario.com.br/',
    },
  })
  const b64 = await res.text()
  if (b64.includes('<!DOCTYPE') || b64.includes('<html')) {
    return NextResponse.json([], { status: 503 })
  }
  const xml = decode(b64)
  return NextResponse.json(parseHolidays(xml))
}
