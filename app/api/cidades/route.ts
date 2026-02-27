import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado')
  if (!estado) return NextResponse.json([], { status: 400 })
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`,
    { next: { revalidate: 86400 } }
  )
  const data: { nome: string }[] = await res.json()
  const cities = data.map((m) => m.nome)
  return NextResponse.json(cities)
}
