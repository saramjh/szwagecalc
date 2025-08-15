import dayjs from "dayjs"

function parseHoursFromRecord(record) {
  if (!record.start_time || !record.end_time) return 0
  const [sh, sm] = String(record.start_time).split(":").map((v) => parseInt(v, 10))
  const [eh, em] = String(record.end_time).split(":").map((v) => parseInt(v, 10))
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0
  const base = dayjs().startOf("day")
  const start = base.add(sh, "hour").add(sm, "minute")
  let end = base.add(eh, "hour").add(em, "minute")
  if (end.isBefore(start)) {
    end = end.add(1, "day")
  }
  return end.diff(start, "minute") / 60
}

export function filterRecordsByMonth(records, referenceDate) {
  const ref = dayjs(referenceDate)
  return (records || []).filter((r) => dayjs(r.date).isSame(ref, "month"))
}

export function computeMonthlySummary(records, referenceDate) {
  const monthly = filterRecordsByMonth(records, referenceDate)
  let totalIncome = 0
  let totalHours = 0
  for (const r of monthly) {
    totalIncome += r.daily_wage || 0
    totalHours += parseHoursFromRecord(r)
  }
  const averageHourly = totalHours > 0 ? Math.round(totalIncome / totalHours) : 0
  return { totalIncome, totalHours, averageHourly }
}

export function computeRecentAverageDailyIncome(records, referenceDate, lookbackDays = 14) {
  const end = dayjs(referenceDate).endOf("day")
  const start = end.subtract(lookbackDays - 1, "day").startOf("day")
  const within = (records || []).filter((r) => {
    const d = dayjs(r.date)
    return (d.isAfter(start, "day") || d.isSame(start, "day")) && (d.isBefore(end, "day") || d.isSame(end, "day"))
  })
  const byDate = new Map()
  for (const r of within) {
    const key = dayjs(r.date).format("YYYY-MM-DD")
    byDate.set(key, (byDate.get(key) || 0) + (r.daily_wage || 0))
  }
  const days = Array.from(byDate.values())
  if (days.length === 0) return 0
  const sum = days.reduce((a, b) => a + b, 0)
  return sum / days.length
}

export function estimateRemainingWorkingDays(records, referenceDate, windowDays = 30) {
  const ref = dayjs(referenceDate)
  const end = ref.endOf("day")
  const start = end.subtract(windowDays - 1, "day").startOf("day")
  const within = (records || []).filter((r) => {
    const d = dayjs(r.date)
    return (d.isAfter(start, "day") || d.isSame(start, "day")) && (d.isBefore(end, "day") || d.isSame(end, "day"))
  })
  const uniqueWorked = new Set(within.map((r) => dayjs(r.date).format("YYYY-MM-DD")))
  const workedDays = uniqueWorked.size
  const rate = Math.min(1, workedDays / windowDays)

  const monthEnd = ref.endOf("month")
  let remaining = 0
  for (let d = ref.add(1, "day"); !d.isAfter(monthEnd, "day"); d = d.add(1, "day")) {
    remaining += 1
  }
  return Math.round(rate * remaining)
}

// computeExpectedMonthlyIncome 제거 (예상 소득 비활성화)

export function findNextPayday(jobs, referenceDate) {
  const ref = dayjs(referenceDate)
  let best = null
  for (const job of jobs || []) {
    if (!job.payday) continue
    const thisMonth = ref.date(job.payday)
    const next = thisMonth.isBefore(ref, "day") ? ref.add(1, "month").date(job.payday) : thisMonth
    if (!best || next.isBefore(best.date)) {
      best = { job, date: next }
    }
  }
  return best // { job, date: dayjs }
}


