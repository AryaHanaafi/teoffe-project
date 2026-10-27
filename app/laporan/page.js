'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah, formatDateShort, getStartOfWeek, getStartOfMonth, getDaysAgo, toCSV, downloadFile } from '@/lib/utils'

const PRODUCT_COLORS = {
  'basically-og': '#7BB8D4',
  'aren-things': '#B8956A',
  'butter-me-up': '#8B7D3C',
  'pandan-club': '#8B9E6B',
  'salty-sip': '#C08B6E',
  'hazel-hang': '#7A6E5A',
}

export default function LaporanPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [productionLogs, setProductionLogs] = useState([])
  const [dateRange, setDateRange] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    fetchData()
  }, [dateRange, customStart, customEnd])

  function getDateFilter() {
    switch (dateRange) {
      case 'today': return getDaysAgo(0)
      case 'week': return getStartOfWeek()
      case 'month': return getStartOfMonth()
      case '3months': return getDaysAgo(90)
      case 'custom': return customStart ? new Date(customStart).toISOString() : getDaysAgo(30)
      default: return getStartOfMonth()
    }
  }

  function getEndDateFilter() {
    if (dateRange === 'custom' && customEnd) {
      const end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)
      return end.toISOString()
    }
    return new Date().toISOString()
  }

  async function fetchData() {
    setLoading(true)
    try {
      const startDate = getDateFilter()
      const endDate = getEndDateFilter()

      const [ordersRes, productsRes, productionRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(*, products(name, slug, color_hex))')
          .gte('order_date', startDate)
          .lte('order_date', endDate)
          .neq('status', 'cancelled')
          .order('order_date', { ascending: false }),
        supabase.from('products').select('*, categories(name)').order('name'),
        supabase
          .from('production_log')
          .select('*, products(name, slug)')
          .gte('production_date', startDate)
          .lte('production_date', endDate)
          .order('production_date', { ascending: false }),
      ])

      setOrders(ordersRes.data || [])
      setProducts(productsRes.data || [])
      setProductionLogs(productionRes.data || [])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Summary stats
  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0)
    const totalOrders = orders.length
    const totalItems = orders.reduce((sum, o) => sum + o.total_items, 0)
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
    const totalProduced = productionLogs.reduce((sum, l) => sum + l.quantity_produced, 0)
    return { totalRevenue, totalOrders, totalItems, avgOrderValue, totalProduced }
  }, [orders, productionLogs])

  // Per-product breakdown
  const productBreakdown = useMemo(() => {
    const map = {}
    products.forEach(p => {
      map[p.id] = { name: p.name, slug: p.slug, color: p.color_hex, sold: 0, revenue: 0, produced: 0 }
    })

    orders.forEach(order => {
      ;(order.order_items || []).forEach(item => {
        if (map[item.product_id]) {
          map[item.product_id].sold += item.quantity
          map[item.product_id].revenue += item.subtotal
        }
      })
    })

    productionLogs.forEach(log => {
      if (map[log.product_id]) {
        map[log.product_id].produced += log.quantity_produced
      }
    })

    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [orders, products, productionLogs])

  // Daily revenue data for chart
  const dailyRevenue = useMemo(() => {
    const dayMap = {}
    orders.forEach(order => {
      const key = new Date(order.order_date).toISOString().slice(0, 10)
      if (!dayMap[key]) dayMap[key] = { date: key, revenue: 0, orders: 0 }
      dayMap[key].revenue += order.total_amount
      dayMap[key].orders++
    })
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))
  }, [orders])

  const maxRevenue = useMemo(() => Math.max(...dailyRevenue.map(d => d.revenue), 1), [dailyRevenue])
  const maxSold = useMemo(() => Math.max(...productBreakdown.map(p => p.sold), 1), [productBreakdown])

  function handleExportCSV() {
    const data = productBreakdown.map(p => ({
      produk: p.name,
      terjual: p.sold,
      revenue: p.revenue,
      diproduksi: p.produced,
    }))
    const csv = toCSV(data, [
      { key: 'produk', label: 'Produk' },
      { key: 'terjual', label: 'Terjual' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'diproduksi', label: 'Diproduksi' },
    ])
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `laporan-teoffe-${dateStr}.csv`)
  }

  function handleExportOrdersCSV() {
    const data = orders.map(o => ({
      nomor: o.order_number,
      tanggal: new Date(o.order_date).toLocaleDateString('id-ID'),
      pelanggan: o.customer_name || '-',
      total: o.total_amount,
      item: o.total_items,
      pembayaran: o.payment_method,
      status: o.status,
    }))
    const csv = toCSV(data, [
      { key: 'nomor', label: 'No. Pesanan' },
      { key: 'tanggal', label: 'Tanggal' },
      { key: 'pelanggan', label: 'Pelanggan' },
      { key: 'total', label: 'Total (Rp)' },
      { key: 'item', label: 'Jumlah Item' },
      { key: 'pembayaran', label: 'Pembayaran' },
      { key: 'status', label: 'Status' },
    ])
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadFile(csv, `pesanan-teoffe-${dateStr}.csv`)
  }

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Laporan</h1>
            <p>Analisis penjualan dan produksi TEOFFE</p>
          </div>
          <div className="btn-group">
            <button className="btn btn-sm btn-secondary" onClick={handleExportCSV}>📥 Export Produk</button>
            <button className="btn btn-sm btn-secondary" onClick={handleExportOrdersCSV}>📥 Export Pesanan</button>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="reports-filters">
        {[
          { key: 'today', label: 'Hari Ini' },
          { key: 'week', label: 'Minggu Ini' },
          { key: 'month', label: 'Bulan Ini' },
          { key: '3months', label: '3 Bulan' },
          { key: 'custom', label: 'Custom' },
        ].map(range => (
          <button
            key={range.key}
            className={`filter-chip ${dateRange === range.key ? 'active' : ''}`}
            onClick={() => setDateRange(range.key)}
          >
            {range.label}
          </button>
        ))}
        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              className="form-input"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ maxWidth: '170px' }}
            />
            <span className="text-muted">—</span>
            <input
              type="date"
              className="form-input"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ maxWidth: '170px' }}
            />
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="reports-summary">
        <div className="reports-summary-card">
          <div className="reports-summary-value" style={{ color: 'var(--teoffe-primary)' }}>
            {formatRupiah(summary.totalRevenue)}
          </div>
          <div className="reports-summary-label">Total Revenue</div>
        </div>
        <div className="reports-summary-card">
          <div className="reports-summary-value" style={{ color: 'var(--teoffe-accent-pink)' }}>
            {summary.totalOrders}
          </div>
          <div className="reports-summary-label">Total Pesanan</div>
        </div>
        <div className="reports-summary-card">
          <div className="reports-summary-value" style={{ color: 'var(--teoffe-accent-orange)' }}>
            {summary.totalItems}
          </div>
          <div className="reports-summary-label">Total Item Terjual</div>
        </div>
        <div className="reports-summary-card">
          <div className="reports-summary-value" style={{ color: 'var(--status-success)' }}>
            {formatRupiah(summary.avgOrderValue)}
          </div>
          <div className="reports-summary-label">Rata-rata per Pesanan</div>
        </div>
        <div className="reports-summary-card">
          <div className="reports-summary-value" style={{ color: 'var(--status-info)' }}>
            {summary.totalProduced}
          </div>
          <div className="reports-summary-label">Total Diproduksi</div>
        </div>
      </div>

      {/* Charts */}
      <div className="chart-section">
        {/* Daily Revenue Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Revenue Harian</h3>
            <span className="text-sm text-muted">{dailyRevenue.length} hari</span>
          </div>
          {dailyRevenue.length > 0 ? (
            <div className="bar-chart" style={{ height: '220px', overflowX: 'auto' }}>
              {dailyRevenue.map((day, i) => (
                <div key={day.date} className="bar-chart-item" style={{ minWidth: dailyRevenue.length > 14 ? '30px' : undefined }}>
                  <div
                    className="bar-chart-bar"
                    style={{
                      height: `${Math.max((day.revenue / maxRevenue) * 180, 8)}px`,
                      background: 'linear-gradient(180deg, var(--teoffe-primary), var(--teoffe-primary-dark))',
                    }}
                  >
                    <span className="bar-chart-value">{(day.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <span className="bar-chart-label">
                    {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <p className="text-muted">Tidak ada data untuk periode ini</p>
            </div>
          )}
        </div>

        {/* Product Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Distribusi Penjualan</h3>
          </div>
          {productBreakdown.some(p => p.sold > 0) ? (
            <>
              <div className="donut-chart" style={{
                background: `conic-gradient(${productBreakdown.filter(p => p.sold > 0).map((p, i, arr) => {
                  const totalSold = arr.reduce((s, pp) => s + pp.sold, 0)
                  const startPct = arr.slice(0, i).reduce((s, pp) => s + (pp.sold / totalSold) * 100, 0)
                  const endPct = startPct + (p.sold / totalSold) * 100
                  return `${p.color} ${startPct}% ${endPct}%`
                }).join(', ')})`,
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: '90px', height: '90px', borderRadius: '50%', background: 'var(--bg-surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="donut-center-value">{summary.totalItems}</span>
                  <span className="donut-center-label">item</span>
                </div>
              </div>
              <div className="chart-legend">
                {productBreakdown.filter(p => p.sold > 0).map(p => (
                  <div key={p.slug} className="chart-legend-item">
                    <div className="chart-legend-dot" style={{ background: p.color }} />
                    <span className="chart-legend-label">{p.name}</span>
                    <span className="chart-legend-value">{p.sold}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <p className="text-muted">Belum ada penjualan</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Breakdown Table */}
      <div className="table-container mb-lg">
        <div className="table-header">
          <h3>Detail Per Produk</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Terjual</th>
              <th>Revenue</th>
              <th>Diproduksi</th>
              <th>Stok Saat Ini</th>
              <th>Grafik Penjualan</th>
            </tr>
          </thead>
          <tbody>
            {productBreakdown.map(p => {
              const product = products.find(pr => pr.slug === p.slug)
              return (
                <tr key={p.slug}>
                  <td>
                    <div className="order-row-product">
                      <div className="order-product-dot" style={{ background: p.color, width: 10, height: 10 }} />
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-mono" style={{ fontWeight: 600 }}>{p.sold}</span>
                  </td>
                  <td>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--teoffe-primary)' }}>
                      {formatRupiah(p.revenue)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info">+{p.produced}</span>
                  </td>
                  <td>
                    <span className={`text-mono ${(product?.current_stock || 0) < 10 ? '' : ''}`}
                      style={{ fontWeight: 600, color: (product?.current_stock || 0) < 10 ? 'var(--status-error)' : 'var(--status-success)' }}>
                      {product?.current_stock || 0}
                    </span>
                  </td>
                  <td style={{ width: '200px' }}>
                    <div style={{
                      height: '20px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${maxSold > 0 ? (p.sold / maxSold) * 100 : 0}%`,
                        background: p.color,
                        borderRadius: '4px',
                        transition: 'width 800ms ease',
                        minWidth: p.sold > 0 ? '8px' : '0',
                      }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Production vs Sales Comparison */}
      <div className="chart-card">
        <div className="chart-card-header">
          <h3>Produksi vs Penjualan</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {productBreakdown.map(p => (
            <div key={p.slug} style={{
              flex: '1 1 140px',
              padding: '16px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              borderLeft: `3px solid ${p.color}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>{p.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: '8px' }}>
                <div>
                  <div className="text-xs text-muted">Produksi</div>
                  <div className="text-mono" style={{ fontWeight: 700, color: 'var(--status-info)' }}>+{p.produced}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Terjual</div>
                  <div className="text-mono" style={{ fontWeight: 700, color: 'var(--teoffe-primary)' }}>-{p.sold}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
