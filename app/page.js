'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah, formatDate, getStartOfToday, getStartOfWeek, getStartOfMonth, getDaysAgo, getStatusClass, getStatusLabel, getPaymentLabel } from '@/lib/utils'

const PRODUCT_COLORS = {
  'basically-og': '#7BB8D4',
  'aren-things': '#B8956A',
  'butter-me-up': '#8B7D3C',
  'pandan-club': '#8B9E6B',
  'salty-sip': '#C08B6E',
  'hazel-hang': '#7A6E5A',
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [todayOrders, setTodayOrders] = useState([])
  const [weekOrders, setWeekOrders] = useState([])
  const [monthOrders, setMonthOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [weeklyData, setWeeklyData] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const today = getStartOfToday()
      const weekStart = getStartOfWeek()
      const monthStart = getStartOfMonth()

      const [productsRes, todayRes, weekRes, monthRes, recentRes, weeklyRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)').eq('is_active', true).order('name'),
        supabase.from('orders').select('*, order_items(*, products(*))').gte('order_date', today).neq('status', 'cancelled'),
        supabase.from('orders').select('id, total_amount, total_items').gte('order_date', weekStart).neq('status', 'cancelled'),
        supabase.from('orders').select('id, total_amount, total_items').gte('order_date', monthStart).neq('status', 'cancelled'),
        supabase.from('orders').select('*, order_items(*, products(name, slug, color_hex))').order('created_at', { ascending: false }).limit(8),
        // Get daily totals for last 7 days
        supabase.from('orders').select('order_date, total_amount').gte('order_date', getDaysAgo(7)).neq('status', 'cancelled').order('order_date'),
      ])

      setProducts(productsRes.data || [])
      setTodayOrders(todayRes.data || [])
      setWeekOrders(weekRes.data || [])
      setMonthOrders(monthRes.data || [])
      setRecentOrders(recentRes.data || [])

      // Process weekly data into daily buckets
      const dailyMap = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        dailyMap[key] = { date: key, total: 0, count: 0, label: d.toLocaleDateString('id-ID', { weekday: 'short' }) }
      }
      ;(weeklyRes.data || []).forEach(order => {
        const key = new Date(order.order_date).toISOString().slice(0, 10)
        if (dailyMap[key]) {
          dailyMap[key].total += order.total_amount
          dailyMap[key].count++
        }
      })
      setWeeklyData(Object.values(dailyMap))
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Computed stats
  const stats = useMemo(() => {
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0)
    const todayCount = todayOrders.length
    const todayItems = todayOrders.reduce((sum, o) => sum + o.total_items, 0)
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total_amount, 0)
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total_amount, 0)
    const lowStockProducts = products.filter(p => p.current_stock < 10)
    const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0)
    return { todayRevenue, todayCount, todayItems, weekRevenue, monthRevenue, lowStockProducts, totalStock }
  }, [todayOrders, weekOrders, monthOrders, products])

  // Product sales distribution (from today's orders)
  const productSales = useMemo(() => {
    const salesMap = {}
    todayOrders.forEach(order => {
      ;(order.order_items || []).forEach(item => {
        const name = item.products?.name || 'Unknown'
        const slug = item.products?.slug || ''
        if (!salesMap[slug]) {
          salesMap[slug] = { name, slug, quantity: 0, revenue: 0, color: PRODUCT_COLORS[slug] || '#5BA4C9' }
        }
        salesMap[slug].quantity += item.quantity
        salesMap[slug].revenue += item.subtotal
      })
    })
    return Object.values(salesMap).sort((a, b) => b.quantity - a.quantity)
  }, [todayOrders])

  // Chart max value for bar chart
  const maxBarValue = useMemo(() => {
    const maxDaily = Math.max(...weeklyData.map(d => d.total), 1)
    return maxDaily
  }, [weeklyData])

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
        <h1>Dashboard</h1>
        <p>Selamat datang di TEOFFE Admin — A Perfect Blend ☕</p>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts.length > 0 && (
        <div className="low-stock-alert animate-slideUp">
          <div className="low-stock-alert-header">
            <span>⚠</span>
            <span>Stok Rendah — {stats.lowStockProducts.length} produk perlu diisi ulang</span>
          </div>
          <div className="low-stock-items">
            {stats.lowStockProducts.map(p => (
              <div key={p.id} className="low-stock-item">
                <span className="stock-dot low" />
                <span>{p.name}</span>
                <span style={{ color: 'var(--status-error)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {p.current_stock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card animate-slideUp stagger-1">
          <div className="stat-card-header">
            <span className="stat-card-label">Revenue Hari Ini</span>
            <div className="stat-card-icon" style={{ background: 'rgba(91, 164, 201, 0.15)', color: 'var(--teoffe-primary)' }}>💰</div>
          </div>
          <div className="stat-card-value">{formatRupiah(stats.todayRevenue)}</div>
          <div className="stat-card-change positive">
            <span>Minggu: {formatRupiah(stats.weekRevenue)}</span>
          </div>
        </div>

        <div className="stat-card animate-slideUp stagger-2">
          <div className="stat-card-header">
            <span className="stat-card-label">Pesanan Hari Ini</span>
            <div className="stat-card-icon" style={{ background: 'rgba(224, 64, 160, 0.15)', color: 'var(--teoffe-accent-pink)' }}>🛒</div>
          </div>
          <div className="stat-card-value">{stats.todayCount}</div>
          <div className="stat-card-change positive">
            <span>{stats.todayItems} item terjual</span>
          </div>
        </div>

        <div className="stat-card animate-slideUp stagger-3">
          <div className="stat-card-header">
            <span className="stat-card-label">Revenue Bulan Ini</span>
            <div className="stat-card-icon" style={{ background: 'rgba(245, 166, 35, 0.15)', color: 'var(--teoffe-accent-orange)' }}>📈</div>
          </div>
          <div className="stat-card-value">{formatRupiah(stats.monthRevenue)}</div>
          <div className="stat-card-change positive">
            <span>{monthOrders.length} pesanan</span>
          </div>
        </div>

        <div className="stat-card animate-slideUp stagger-4">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Stok</span>
            <div className="stat-card-icon" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--status-success)' }}>📦</div>
          </div>
          <div className="stat-card-value">{stats.totalStock}</div>
          <div className={`stat-card-change ${stats.lowStockProducts.length > 0 ? 'negative' : 'positive'}`}>
            <span>{stats.lowStockProducts.length > 0 ? `${stats.lowStockProducts.length} stok rendah` : 'Semua stok aman'}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="chart-section">
        {/* Revenue Chart (Bar) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Revenue 7 Hari Terakhir</h3>
          </div>
          <div className="bar-chart" style={{ height: '220px' }}>
            {weeklyData.map((day, i) => (
              <div key={day.date} className="bar-chart-item">
                <div
                  className="bar-chart-bar"
                  style={{
                    height: `${maxBarValue > 0 ? Math.max((day.total / maxBarValue) * 180, day.total > 0 ? 20 : 4) : 4}px`,
                    background: day.total > 0 ? `linear-gradient(180deg, var(--teoffe-primary), var(--teoffe-primary-dark))` : 'var(--bg-elevated)',
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  {day.total > 0 && (
                    <span className="bar-chart-value">{(day.total / 1000).toFixed(0)}K</span>
                  )}
                </div>
                <span className="bar-chart-label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Penjualan Hari Ini</h3>
          </div>
          {productSales.length > 0 ? (
            <>
              <div className="donut-chart" style={{
                background: `conic-gradient(${productSales.map((p, i) => {
                  const totalQty = productSales.reduce((s, pp) => s + pp.quantity, 0)
                  const startPct = productSales.slice(0, i).reduce((s, pp) => s + (pp.quantity / totalQty) * 100, 0)
                  const endPct = startPct + (p.quantity / totalQty) * 100
                  return `${p.color} ${startPct}% ${endPct}%`
                }).join(', ')})`,
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: '90px', height: '90px', borderRadius: '50%', background: 'var(--bg-surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="donut-center-value">{productSales.reduce((s, p) => s + p.quantity, 0)}</span>
                  <span className="donut-center-label">item</span>
                </div>
              </div>
              <div className="chart-legend">
                {productSales.map(p => (
                  <div key={p.slug} className="chart-legend-item">
                    <div className="chart-legend-dot" style={{ background: p.color }} />
                    <span className="chart-legend-label">{p.name}</span>
                    <span className="chart-legend-value">{p.quantity}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon">☕</div>
              <p className="text-sm text-muted">Belum ada penjualan hari ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="dashboard-recent">
        <div className="dashboard-recent-header">
          <h3>Pesanan Terbaru</h3>
          <a href="/penjualan" className="btn btn-sm btn-secondary">Lihat Semua →</a>
        </div>
        {recentOrders.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Pesanan</th>
                <th>Produk</th>
                <th>Total</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span className="text-mono text-sm" style={{ fontWeight: 600 }}>
                      {order.order_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(order.order_items || []).map((item, i) => (
                        <div key={i} className="order-row-product">
                          <div className="order-product-dot" style={{ background: item.products?.color_hex || 'var(--teoffe-primary)' }} />
                          <span className="text-sm">{item.products?.name} × {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="text-mono" style={{ fontWeight: 600, color: 'var(--teoffe-primary)' }}>
                      {formatRupiah(order.total_amount)}
                    </span>
                  </td>
                  <td><span className="text-sm">{getPaymentLabel(order.payment_method)}</span></td>
                  <td><span className={`badge ${getStatusClass(order.status)}`}>{getStatusLabel(order.status)}</span></td>
                  <td><span className="text-sm text-muted">{formatDate(order.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-title">Belum ada pesanan</p>
            <p className="empty-state-text">Pesanan baru akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  )
}
