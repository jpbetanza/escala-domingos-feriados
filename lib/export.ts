'use client'

import { Schedule, Vendor } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getVendorName(id: string, vendors: Vendor[]): string {
  return vendors.find((v) => v.id === id)?.name ?? id
}

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
}

function getDayOfWeek(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE', { locale: ptBR })
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function exportToExcel(schedule: Schedule, vendors: Vendor[]): Promise<void> {
  const { utils, writeFile } = await import('xlsx')

  // Group entries by month
  const byMonth: Record<number, typeof schedule.entries> = {}
  for (const entry of schedule.entries) {
    const month = parseISO(entry.date).getMonth()
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(entry)
  }

  const wb = utils.book_new()

  for (let m = 0; m < 12; m++) {
    const entries = byMonth[m] ?? []
    const monthName = capitalizeFirst(
      format(new Date(schedule.year, m, 1), 'MMMM', { locale: ptBR })
    )

    const rows: (string | number)[][] = [
      ['Data', 'Dia', 'Tipo', 'Vendedor 1', 'Vendedor 2', 'Vendedor 3', 'Obs'],
    ]

    let sundayTotal = 0
    let holidayTotal = 0

    for (const entry of entries) {
      const type = entry.type === 'sunday' ? 'Domingo' : 'Feriado'
      const vendorNames = entry.vendorIds.map((id) => getVendorName(id, vendors))
      const closed = entry.closed ? '(Fechado)' : ''
      rows.push([
        formatDate(entry.date),
        capitalizeFirst(getDayOfWeek(entry.date)),
        type,
        vendorNames[0] ?? '',
        vendorNames[1] ?? '',
        vendorNames[2] ?? '',
        entry.note ?? closed,
      ])
      if (!entry.closed) {
        if (entry.type === 'sunday') sundayTotal++
        else holidayTotal++
      }
    }

    rows.push([])
    rows.push(['', '', 'Total Domingos', sundayTotal, '', '', ''])
    rows.push(['', '', 'Total Feriados', holidayTotal, '', '', ''])

    const ws = utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]
    utils.book_append_sheet(wb, ws, monthName)
  }

  writeFile(wb, `cronograma-${schedule.year}.xlsx`)
}

export async function exportToPDF(schedule: Schedule, vendors: Vendor[]): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = pdf.internal.pageSize.getWidth()   // 210 mm
  const pageH = pdf.internal.pageSize.getHeight()  // 297 mm

  // ── Layout constants ───────────────────────────────────────────────
  const ML = 12
  const MR = 12
  const CONTENT_W = pageW - ML - MR              // 186 mm
  const COL_GAP = 3
  const COL_W = (CONTENT_W - COL_GAP * 2) / 3   // 60 mm
  const GRID_TOP = 28
  const ROW_H = 53
  const MONTH_HEADER_H = 6
  const ENTRY_H = 5.5
  const MAX_ENTRIES = Math.floor((ROW_H - MONTH_HEADER_H) / ENTRY_H) // 8

  // Column X: 12, 75, 138
  const COL_X = [ML, ML + COL_W + COL_GAP, ML + (COL_W + COL_GAP) * 2]
  // Row Y: 28, 81, 134, 187
  const ROW_Y = [GRID_TOP, GRID_TOP + ROW_H, GRID_TOP + ROW_H * 2, GRID_TOP + ROW_H * 3]

  // ── Filter: only entries with vendors assigned or marked closed ────
  const visibleEntries = schedule.entries.filter(
    (e) => e.closed || e.vendorIds.length > 0
  )

  // ── Group visible entries by month ─────────────────────────────────
  const byMonth: Record<number, typeof visibleEntries> = {}
  for (const entry of visibleEntries) {
    const m = parseISO(entry.date).getMonth()
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(entry)
  }

  // ── Vendor stats (computed over ALL entries, not just visible) ─────
  const vendorStats: Record<string, { sundays: number; holidays: number }> = {}
  for (const entry of schedule.entries) {
    if (entry.closed) continue
    for (const id of entry.vendorIds) {
      if (!vendorStats[id]) vendorStats[id] = { sundays: 0, holidays: 0 }
      if (entry.type === 'sunday') vendorStats[id].sundays++
      else vendorStats[id].holidays++
    }
  }

  // ── Title ──────────────────────────────────────────────────────────
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 23, 42)
  pdf.text(`Cronograma ${schedule.year} — Escala Loja`, ML, 18)
  pdf.setDrawColor(203, 213, 225)
  pdf.line(ML, 21, pageW - MR, 21)

  // ── Month grid (3 columns × 4 rows) ───────────────────────────────
  for (let m = 0; m < 12; m++) {
    const rowIdx = Math.floor(m / 3)
    const colIdx = m % 3
    const cellX = COL_X[colIdx]
    const cellY = ROW_Y[rowIdx]
    const entries = byMonth[m] ?? []

    // Cell border
    pdf.setDrawColor(203, 213, 225)
    pdf.rect(cellX, cellY, COL_W, ROW_H, 'S')

    // Month header bar
    pdf.setFillColor(30, 41, 59)
    pdf.rect(cellX, cellY, COL_W, MONTH_HEADER_H, 'F')
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    const monthName = capitalizeFirst(
      format(new Date(schedule.year, m, 1), 'MMMM', { locale: ptBR })
    )
    pdf.text(monthName.toUpperCase(), cellX + 2, cellY + 4.3)

    // Entry rows
    const showCount = Math.min(entries.length, MAX_ENTRIES)
    for (let i = 0; i < showCount; i++) {
      const entry = entries[i]
      const ey = cellY + MONTH_HEADER_H + i * ENTRY_H
      const textY = ey + ENTRY_H - 1.5

      // Background highlight
      if (entry.closed) {
        pdf.setFillColor(226, 232, 240)
        pdf.rect(cellX, ey, COL_W, ENTRY_H, 'F')
      } else if (entry.type === 'holiday') {
        pdf.setFillColor(254, 226, 226)
        pdf.rect(cellX, ey, COL_W, ENTRY_H, 'F')
      }

      // Date column
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(15, 23, 42)
      pdf.text(format(parseISO(entry.date), 'dd/MM'), cellX + 2, textY)

      // Vendors / closed label
      if (entry.closed) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(100, 116, 139)
        pdf.text('FECHADO', cellX + 15, textY)
      } else {
        const names = entry.vendorIds.map((id) => getVendorName(id, vendors)).join(', ')
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(15, 23, 42)
        pdf.text(names, cellX + 15, textY, { maxWidth: COL_W - 17 })
      }

      // Row separator
      pdf.setDrawColor(226, 232, 240)
      pdf.line(cellX, ey + ENTRY_H, cellX + COL_W, ey + ENTRY_H)
    }

    // Overflow indicator
    if (entries.length > MAX_ENTRIES) {
      const oy = cellY + MONTH_HEADER_H + MAX_ENTRIES * ENTRY_H + 2
      pdf.setFontSize(5.5)
      pdf.setFont('helvetica', 'italic')
      pdf.setTextColor(100, 116, 139)
      pdf.text(`+${entries.length - MAX_ENTRIES} mais`, cellX + 2, oy)
    }
  }

  // ── Vendor summary section ─────────────────────────────────────────
  // Grid ends at ROW_Y[3] + ROW_H = 187 + 53 = 240
  const gridBottom = ROW_Y[3] + ROW_H          // 240
  const SY_DIVIDER = gridBottom + 3          // 243
  const SY_TITLE = SY_DIVIDER + 5         // 248
  const SY_HEADER = SY_TITLE + 7           // 255
  const SY_ROWS_START = SY_HEADER + 5.5        // 260.5

  const summaryVendors = vendors.filter((v) => vendorStats[v.id])

  pdf.setDrawColor(203, 213, 225)
  pdf.line(ML, SY_DIVIDER, pageW - MR, SY_DIVIDER)

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 23, 42)
  pdf.text('Resumo por Vendedor', ML, SY_TITLE)

  // Summary table column positions
  const SUM_NAME = ML
  const SUM_SUN = pageW - MR - 50
  const SUM_HOL = pageW - MR - 28
  const SUM_TOTAL = pageW - MR - 6

  // Table header
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(71, 85, 105)
  pdf.text('Vendedor', SUM_NAME, SY_HEADER)
  pdf.text('Dom', SUM_SUN, SY_HEADER, { align: 'right' })
  pdf.text('Fer', SUM_HOL, SY_HEADER, { align: 'right' })
  pdf.text('Total', SUM_TOTAL, SY_HEADER, { align: 'right' })

  pdf.setDrawColor(203, 213, 225)
  pdf.line(ML, SY_HEADER + 1.5, pageW - MR, SY_HEADER + 1.5)

  // Table rows
  let sy = SY_ROWS_START
  for (const vendor of summaryVendors) {
    const stats = vendorStats[vendor.id]
    const total = stats.sundays + stats.holidays * 2

    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(15, 23, 42)
    pdf.text(vendor.name, SUM_NAME, sy)
    pdf.text(String(stats.sundays), SUM_SUN, sy, { align: 'right' })
    pdf.text(String(stats.holidays), SUM_HOL, sy, { align: 'right' })
    pdf.setFont('helvetica', 'bold')
    pdf.text(String(total), SUM_TOTAL, sy, { align: 'right' })

    pdf.setDrawColor(226, 232, 240)
    pdf.line(ML, sy + 1.5, pageW - MR, sy + 1.5)
    sy += 4.5
  }

  // ── Page number ────────────────────────────────────────────────────
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(148, 163, 184)
  pdf.text('1 / 1', pageW - MR, pageH - 8, { align: 'right' })

  pdf.save(`cronograma-${schedule.year}.pdf`)
}
