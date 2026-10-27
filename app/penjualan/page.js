'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah, formatDate, getStatusClass, getStatusLabel, getPaymentLabel } from '@/lib/utils'
import Modal from '@/components/Modal'
import { showToast } from '@/components/Toast'

export default function PenjualanPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderDetailModal, setOrderDetailModal] = useState({ open: false, order: null })
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [tab, setTab] = useState('pos')
  const PAGE_SIZE = 10

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)').eq('is_active', true).order('name'),
        supabase.from('orders').select('*, order_items(*, products(name, slug, color_hex))').order('created_at', { ascending: false }).limit(200),
      ])
      setProducts(productsRes.data || [])
      setOrders(ordersRes.data || [])
    } catch (err) {
      console.error('Fetch error:', err)
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Cart functions
  function addToCart(product) {
    if (product.current_stock <= 0) {
      showToast('Stok habis!', 'error')
      return
    }
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          showToast(`Stok ${product.name} hanya tersisa ${product.current_stock}`, 'warning')
          return prev
        }
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        )
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        color_hex: product.color_hex,
        unit_price: product.price,
        quantity: 1,
        subtotal: product.price,
        max_stock: product.current_stock,
      }]
    })
  }

  function updateCartQty(productId, delta) {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return null
        if (newQty > item.max_stock) {
          showToast(`Stok maksimal ${item.max_stock}`, 'warning')
          return item
        }
        return { ...item, quantity: newQty, subtotal: newQty * item.unit_price }
      }).filter(Boolean)
    })
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(item => item.product_id !== productId))
  }

  function clearCart() {
    setCart([])
    setCustomerName('')
    setPaymentMethod('cash')
    setNotes('')
  }

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  function getCartQty(productId) {
    const item = cart.find(i => i.product_id === productId)
    return item ? item.quantity : 0
  }

  async function handleSubmitOrder(e) {
    e.preventDefault()
    if (cart.length === 0) {
      showToast('Keranjang kosong!', 'error')
      return
    }
    setSubmitting(true)
    try {
      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: '',
          total_amount: cartTotal,
          total_items: cartCount,
          status: 'completed',
          payment_method: paymentMethod,
          customer_name: customerName,
          notes: notes,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      showToast(`Pesanan ${order.order_number} berhasil dibuat! Total: ${formatRupiah(cartTotal)}`, 'success')
      clearCart()
      fetchData()
    } catch (err) {
      console.error('Order error:', err)
      showToast('Gagal membuat pesanan: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelOrder(orderId) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
      if (error) throw error
      showToast('Pesanan dibatalkan. Stok dikembalikan.', 'success')
      setOrderDetailModal({ open: false, order: null })
      fetchData()
    } catch (err) {
      showToast('Gagal membatalkan pesanan: ' + err.message, 'error')
    }
  }

  async function openOrderDetail(order) {
    setOrderDetailModal({ open: true, order })
  }

  // Filtered and paginated orders
  const filteredOrders = useMemo(() => {
    let result = orders
    if (filterStatus !== 'all') {
      result = result.filter(o => o.status === filterStatus)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [orders, filterStatus, searchQuery])

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
            <h1>Penjualan</h1>
            <p>Buat pesanan baru dan kelola riwayat penjualan</p>
          </div>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${tab === 'pos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('pos')}
            >
              🛒 Kasir (POS)
            </button>
            <button
              className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('history')}
            >
              📋 Riwayat
            </button>
          </div>
        </div>
      </div>

      {tab === 'pos' ? (
        /* ===== POS TAB ===== */
        <div className="pos-layout">
          {/* Product Selection */}
          <div>
            <div className="pos-products-header">
              <h3>Pilih Produk</h3>
            </div>
            <div className="pos-products-grid">
              {products.map(product => {
                const qty = getCartQty(product.id)
                const outOfStock = product.current_stock <= 0
                return (
                  <div
                    key={product.id}
                    className={`pos-product-card ${outOfStock ? 'out-of-stock' : ''}`}
                    style={{ '--product-color': product.color_hex }}
                    onClick={() => { if (!outOfStock) addToCart(product) }}
                  >
                    <div className="pos-product-name">{product.name}</div>
                    <div className="pos-product-type">{product.type}</div>
                    <div className="pos-product-info">
                      <span className="pos-product-price">{formatRupiah(product.price)}</span>
                      <span className="pos-product-stock-badge">
                        {outOfStock ? 'Habis' : `${product.current_stock} stok`}
                      </span>
                    </div>
                    {qty > 0 && (
                      <div className="pos-product-qty" onClick={(e) => e.stopPropagation()}>
                        <button className="pos-qty-btn" onClick={() => updateCartQty(product.id, -1)}>−</button>
                        <span className="pos-qty-value">{qty}</span>
                        <button className="pos-qty-btn" onClick={() => updateCartQty(product.id, 1)}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cart */}
          <div className="pos-cart">
            <div className="pos-cart-header">
              <h3>🛒 Keranjang</h3>
              {cartCount > 0 && <span className="pos-cart-count">{cartCount} item</span>}
            </div>

            <div className="pos-cart-items">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.product_id} className="pos-cart-item">
                    <div className="pos-cart-item-color" style={{ background: item.color_hex }} />
                    <div className="pos-cart-item-info">
                      <div className="pos-cart-item-name">{item.name}</div>
                      <div className="pos-cart-item-detail">{item.quantity} × {formatRupiah(item.unit_price)}</div>
                    </div>
                    <div className="pos-cart-item-subtotal">{formatRupiah(item.subtotal)}</div>
                    <button className="pos-cart-item-remove" onClick={() => removeFromCart(item.product_id)}>✕</button>
                  </div>
                ))
              ) : (
                <div className="pos-cart-empty">
                  <div className="pos-cart-empty-icon">🛒</div>
                  <p>Keranjang kosong</p>
                  <p className="text-xs text-muted">Klik produk untuk menambahkan</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="pos-cart-form">
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label">Nama Pelanggan</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Opsional"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label">Pembayaran</label>
                    <select
                      className="form-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="cash">Tunai</option>
                      <option value="transfer">Transfer</option>
                      <option value="qris">QRIS</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Catatan</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Opsional"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pos-cart-total">
                  <span className="pos-cart-total-label">Total</span>
                  <span className="pos-cart-total-value">{formatRupiah(cartTotal)}</span>
                </div>

                <div className="pos-cart-footer">
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button className="btn btn-secondary btn-sm" onClick={clearCart} style={{ flex: '0 0 auto' }}>
                      Hapus
                    </button>
                    <button
                      className="btn btn-gradient w-full"
                      onClick={handleSubmitOrder}
                      disabled={submitting}
                      style={{ flex: 1 }}
                    >
                      {submitting ? 'Memproses...' : `Buat Pesanan — ${formatRupiah(cartTotal)}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ===== HISTORY TAB ===== */
        <>
          {/* Filters */}
          <div className="flex items-center justify-between gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
            <div className="filter-bar">
              {['all', 'completed', 'pending', 'confirmed', 'cancelled'].map(status => (
                <button
                  key={status}
                  className={`filter-chip ${filterStatus === status ? 'active' : ''}`}
                  onClick={() => { setFilterStatus(status); setCurrentPage(1) }}
                >
                  {status === 'all' ? 'Semua' : getStatusLabel(status)}
                </button>
              ))}
            </div>
            <div className="search-bar">
              <span className="search-bar-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Cari no. pesanan / pelanggan..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                style={{ paddingLeft: '38px', maxWidth: '300px' }}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-container">
            {paginatedOrders.length > 0 ? (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Pesanan</th>
                      <th>Pelanggan</th>
                      <th>Produk</th>
                      <th>Total</th>
                      <th>Bayar</th>
                      <th>Status</th>
                      <th>Waktu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <span className="text-mono text-sm" style={{ fontWeight: 600 }}>
                            {order.order_number}
                          </span>
                        </td>
                        <td className="text-sm">{order.customer_name || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(order.order_items || []).slice(0, 2).map((item, i) => (
                              <div key={i} className="order-row-product">
                                <div className="order-product-dot" style={{ background: item.products?.color_hex || 'var(--teoffe-primary)' }} />
                                <span className="text-xs">{item.products?.name} ×{item.quantity}</span>
                              </div>
                            ))}
                            {(order.order_items || []).length > 2 && (
                              <span className="text-xs text-muted">+{(order.order_items || []).length - 2} lainnya</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-mono text-sm" style={{ fontWeight: 600, color: 'var(--teoffe-primary)' }}>
                            {formatRupiah(order.total_amount)}
                          </span>
                        </td>
                        <td className="text-sm">{getPaymentLabel(order.payment_method)}</td>
                        <td>
                          <span className={`badge ${getStatusClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{formatDate(order.created_at)}</td>
                        <td>
                          <button className="btn btn-xs btn-secondary" onClick={() => openOrderDetail(order)}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="table-footer">
                  <span>Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} dari {filteredOrders.length}</span>
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      ←
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page
                      if (totalPages <= 5) {
                        page = i + 1
                      } else if (currentPage <= 3) {
                        page = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i
                      } else {
                        page = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={page}
                          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p className="empty-state-title">Tidak ada pesanan</p>
                <p className="empty-state-text">
                  {searchQuery || filterStatus !== 'all' ? 'Coba ubah filter pencarian' : 'Mulai buat pesanan baru di tab Kasir'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      <Modal
        isOpen={orderDetailModal.open}
        onClose={() => setOrderDetailModal({ open: false, order: null })}
        title={`Detail Pesanan — ${orderDetailModal.order?.order_number || ''}`}
        size="lg"
        footer={
          orderDetailModal.order?.status !== 'cancelled' && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleCancelOrder(orderDetailModal.order.id)}
            >
              Batalkan Pesanan
            </button>
          )
        }
      >
        {orderDetailModal.order && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-row">
              <div>
                <span className="form-label">Pelanggan</span>
                <p className="text-sm">{orderDetailModal.order.customer_name || '-'}</p>
              </div>
              <div>
                <span className="form-label">Pembayaran</span>
                <p className="text-sm">{getPaymentLabel(orderDetailModal.order.payment_method)}</p>
              </div>
            </div>
            <div className="form-row">
              <div>
                <span className="form-label">Status</span>
                <p><span className={`badge ${getStatusClass(orderDetailModal.order.status)}`}>{getStatusLabel(orderDetailModal.order.status)}</span></p>
              </div>
              <div>
                <span className="form-label">Waktu</span>
                <p className="text-sm">{formatDate(orderDetailModal.order.created_at)}</p>
              </div>
            </div>
            {orderDetailModal.order.notes && (
              <div>
                <span className="form-label">Catatan</span>
                <p className="text-sm text-muted">{orderDetailModal.order.notes}</p>
              </div>
            )}
            <div>
              <span className="form-label">Item Pesanan</span>
              <table className="data-table" style={{ marginTop: '8px' }}>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Qty</th>
                    <th>Harga</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(orderDetailModal.order.order_items || []).map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div className="order-row-product">
                          <div className="order-product-dot" style={{ background: item.products?.color_hex || 'var(--teoffe-primary)' }} />
                          <span>{item.products?.name}</span>
                        </div>
                      </td>
                      <td className="text-mono">{item.quantity}</td>
                      <td className="text-mono">{formatRupiah(item.unit_price)}</td>
                      <td className="text-mono" style={{ fontWeight: 600 }}>{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'right', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span className="text-sm text-muted">Total: </span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--teoffe-primary)' }}>
                {formatRupiah(orderDetailModal.order.total_amount)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
