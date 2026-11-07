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
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderDetailModal, setOrderDetailModal] = useState({ open: false, order: null })
  const [receiptModal, setReceiptModal] = useState({ open: false, order: null, items: [] })
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [posCategory, setPosCategory] = useState('all')
  const [posSearch, setPosSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [tab, setTab] = useState('pos')
  const PAGE_SIZE = 10

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [productsRes, ordersRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)').eq('is_active', true).order('name'),
        supabase.from('orders').select('*, order_items(*, products(name, slug, color_hex))').order('created_at', { ascending: false }).limit(200),
        supabase.from('categories').select('*').order('name'),
      ])
      setProducts(productsRes.data || [])
      setOrders(ordersRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (err) {
      console.error('Fetch error:', err)
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Cart functions
  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
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
      }]
    })
  }

  function updateCartQty(productId, delta) {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return null
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
          customer_name: customerName.trim() || 'Umum',
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
      setReceiptModal({
        open: true,
        order: {
          ...order,
          customer_name: customerName.trim() || 'Umum',
          payment_method: paymentMethod,
          total_amount: cartTotal,
          created_at: new Date().toISOString(),
        },
        items: [...cart],
      })
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
      showToast('Pesanan dibatalkan.', 'success')
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

  const filteredPosProducts = useMemo(() => {
    return products.filter(p => {
      if (posCategory !== 'all' && p.category_id !== posCategory) return false
      if (posSearch.trim()) {
        const q = posSearch.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !(p.type || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [products, posCategory, posSearch])

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
            <div className="pos-products-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Pilih Menu ({filteredPosProducts.length})</h3>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Cari menu..."
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  style={{ maxWidth: '180px', fontSize: '0.8rem', padding: '4px 10px' }}
                />
              </div>

              {/* Category Filter Chips in POS */}
              {categories.length > 0 && (
                <div className="filter-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  <button
                    className={`filter-chip ${posCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setPosCategory('all')}
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    Semua
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`filter-chip ${posCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setPosCategory(cat.id)}
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pos-products-grid">
              {filteredPosProducts.map(product => {
                const qty = getCartQty(product.id)
                return (
                  <div
                    key={product.id}
                    className="pos-product-card"
                    style={{
                      '--product-color': product.color_hex || '#5BA4C9',
                      overflow: 'hidden',
                      padding: '10px 12px',
                    }}
                    onClick={() => addToCart(product)}
                  >
                    {/* Uniform Thumbnail Banner */}
                    <div
                      style={{
                        height: '74px',
                        width: '100%',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        marginBottom: '8px',
                        background: product.image_url
                          ? 'var(--bg-elevated)'
                          : `linear-gradient(135deg, ${product.color_hex || '#5BA4C9'}26, ${product.color_hex || '#5BA4C9'}66)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.8rem', opacity: 0.85 }}>☕</span>
                      )}
                    </div>

                    <div
                      className="pos-product-name"
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={product.name}
                    >
                      {product.name}
                    </div>
                    <div
                      className="pos-product-type"
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '6px',
                      }}
                    >
                      {product.type || 'Menu'}
                    </div>

                    <div className="pos-product-info" style={{ marginTop: 'auto' }}>
                      <span className="pos-product-price" style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                        {formatRupiah(product.price)}
                      </span>
                    </div>

                    {qty > 0 && (
                      <div className="pos-product-qty" onClick={(e) => e.stopPropagation()} style={{ marginTop: '8px', paddingTop: '6px' }}>
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

            {/* Input Atas Nama */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤</span> Atas Nama
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Kak Budi / Meja 03..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
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
                      placeholder="Opsional (misal: less sugar, hot)"
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
                      <th>Atas Nama</th>
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
                <span className="form-label">Atas Nama</span>
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

      {/* Receipt Modal (Struk Bukti Transaksi) */}
      <Modal
        isOpen={receiptModal.open}
        onClose={() => setReceiptModal({ open: false, order: null, items: [] })}
        title="🧾 Struk Transaksi Sukses"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
              style={{ flex: 1 }}
            >
              🖨️ Cetak Struk
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setReceiptModal({ open: false, order: null, items: [] })}
              style={{ flex: 1 }}
            >
              Pesanan Baru
            </button>
          </div>
        }
      >
        {receiptModal.order && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>TEOFFE</div>
            <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginBottom: '12px' }}>A Perfect Blend • sip happens.</div>

            <div style={{ borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', padding: '10px 0', margin: '12px 0', textAlign: 'left', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-muted">No. Pesanan:</span>
                <span className="text-mono font-bold">{receiptModal.order.order_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-muted">Atas Nama:</span>
                <span className="font-bold">{receiptModal.order.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-muted">Waktu:</span>
                <span>{formatDate(receiptModal.order.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Pembayaran:</span>
                <span>{getPaymentLabel(receiptModal.order.payment_method)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '14px' }}>
              <div className="text-xs text-muted font-semibold mb-xs">RINCIAN PESANAN:</div>
              {receiptModal.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span>{it.name} <span className="text-muted">×{it.quantity}</span></span>
                  <span className="text-mono">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total Bayar:</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--teoffe-primary)', fontFamily: 'var(--font-heading)' }}>
                {formatRupiah(receiptModal.order.total_amount)}
              </span>
            </div>

            <div className="text-xs text-muted" style={{ marginTop: '16px' }}>
              Terima kasih atas pesanan Anda! 🙏
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
