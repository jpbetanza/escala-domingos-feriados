import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { ano, ibge } = Object.fromEntries(req.nextUrl.searchParams)
  if (!ano || !ibge) return NextResponse.json([], { status: 400 })

  const apiKey = process.env.FERIADOS_API_KEY
  if (!apiKey) return NextResponse.json([], { status: 500 })

  const res = await fetch(
    `https://feriadosapi.com/api/v1/feriados?ano=${ano}&ibge=${ibge}`,
    {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  )
  if (!res.ok) return NextResponse.json([], { status: res.status })

  const data: { feriados: { data: string; nome: string; tipo: string }[] } = await res.json()
  const holidays = (data.feriados ?? [])
    .filter((h) => h.tipo === 'MUNICIPAL' || h.tipo === 'ESTADUAL')
    .map((h) => {
      const [dd, mm, yyyy] = h.data.split('/')
      return { date: `${yyyy}-${mm}-${dd}`, name: h.nome }
    })

  return NextResponse.json(holidays)
}
