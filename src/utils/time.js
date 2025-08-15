import dayjs from "dayjs"

export function parseHHmm(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null
  const [hStr, mStr] = timeStr.split(":")
  const hours = parseInt(hStr, 10)
  const minutes = parseInt(mStr, 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return dayjs().startOf("day").add(hours, "hour").add(minutes, "minute")
}


