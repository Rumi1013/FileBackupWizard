// Utility functions for the business planner

// Format currency values
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.min(Math.round((value / total) * 100), 100)
}

// Get date range for current week
export function getCurrentWeekDates(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday

  // Calculate start of week (Sunday)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)

  // Calculate end of week (Saturday)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return { start: startOfWeek, end: endOfWeek }
}

// Format date for display
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// Get energy level color
export function getEnergyLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case "high":
      return "bg-green-600"
    case "medium":
      return "bg-[#D4AF37]"
    case "low":
      return "bg-[#4B3D5B]"
    default:
      return "bg-[#A3B18A]"
  }
}

// Get priority color
export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-green-600"
    case "medium":
      return "bg-[#D4AF37]"
    case "low":
      return "bg-[#4B3D5B]"
    case "someday":
      return "bg-[#0A3B4D]"
    default:
      return "bg-[#A3B18A]"
  }
}

// Generate suggested time blocks for executive dysfunction
export function getSuggestedTimeBlocks(): { time: string; suggestion: string; energyLevel: string }[] {
  return [
    { time: "9:00 - 10:00", suggestion: "Warm-up task (email, planning)", energyLevel: "Medium" },
    { time: "10:00 - 12:00", suggestion: "Creative work (when focus is best)", energyLevel: "High" },
    { time: "12:00 - 1:00", suggestion: "Lunch & rest", energyLevel: "Low" },
    { time: "1:00 - 2:00", suggestion: "Light admin tasks", energyLevel: "Medium" },
    { time: "2:00 - 4:00", suggestion: "Second focus block", energyLevel: "Medium" },
    { time: "4:00 - 5:00", suggestion: "Wrap-up & planning for tomorrow", energyLevel: "Low" },
  ]
}

