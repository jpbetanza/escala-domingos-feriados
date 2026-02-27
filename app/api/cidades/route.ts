import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado')
  if (!estado) return NextResponse.json([], { status: 400 })
  const res = await fetch(
    `https://calendario.com.br/cidades.php?estado=${estado}&format=txt`,
    { next: { revalidate: 86400 } }
  )
  const text = await res.text()
  const cities = text.split('\n').map((c) => c.trim()).filter(Boolean)
  return NextResponse.json(cities)
}
