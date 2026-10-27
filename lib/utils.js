/**
 * Format number to Indonesian Rupiah
 * @param {number} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date to Indonesian locale
 * @param {string|Date} date
 * @param {object} options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const defaultOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }
  return new Intl.DateTimeFormat('id-ID', defaultOptions).format(new Date(date))
}

/**
 * Format date to short format (no time)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateShort(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Get start of today in ISO string
 * @returns {string}
 */
export function getStartOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

/**
 * Get start of this week (Monday) in ISO string
 * @returns {string}
 */
export function getStartOfWeek() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  now.setDate(now.getDate() - diff)
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

/**
 * Get start of this month in ISO string
 * @returns {string}
 */
export function getStartOfMonth() {
  const now = new Date()
  now.setDate(1)
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

/**
 * Get date N days ago in ISO string
 * @param {number} days
 * @returns {string}
 */
export function getDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

/**
 * Generate a batch number for production
 * @returns {string}
 */
export function generateBatchNumber() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '')
  return `BATCH-${dateStr}-${timeStr}`
}

/**
 * Get status badge color class
 * @param {string} status
 * @returns {string}
 */
export function getStatusClass(status) {
  switch (status) {
    case 'completed': return 'badge-success'
    case 'confirmed': return 'badge-info'
    case 'pending': return 'badge-warning'
    case 'cancelled': return 'badge-error'
    default: return 'badge-default'
  }
}

/**
 * Get status label in Indonesian
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'completed': return 'Selesai'
    case 'confirmed': return 'Dikonfirmasi'
    case 'pending': return 'Menunggu'
    case 'cancelled': return 'Dibatalkan'
    default: return status
  }
}

/**
 * Get payment method label
 * @param {string} method
 * @returns {string}
 */
export function getPaymentLabel(method) {
  switch (method) {
    case 'cash': return 'Tunai'
    case 'transfer': return 'Transfer'
    case 'qris': return 'QRIS'
    default: return method
  }
}

/**
 * Convert array of objects to CSV string
 * @param {Array<Object>} data
 * @param {Array<{key: string, label: string}>} columns
 * @returns {string}
 */
export function toCSV(data, columns) {
  const header = columns.map(c => c.label).join(',')
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key]
      if (val === null || val === undefined) val = ''
      val = String(val).replace(/"/g, '""')
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`
      }
      return val
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

/**
 * Download string as file
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Debounce function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
