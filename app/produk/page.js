'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah, formatDate, generateBatchNumber } from '@/lib/utils'
import Modal from '@/components/Modal'
import { showToast } from '@/components/Toast'

export default function ProdukPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [productionModal, setProductionModal] = useState({ open: false, product: null })
  const [historyModal, setHistoryModal] = useState({ open: false, product: null, logs: [] })
  const [prodForm, setProdForm] = useState({ quantity: '', batchNumber: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)').order('name'),
        supabase.from('categories').select('*').order('name'),
      ])
      setProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (err) {
      console.error('Fetch error:', err)
      showToast('Gagal memuat data produk', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openProductionModal(product) {
    setProdForm({ quantity: '', batchNumber: generateBatchNumber(), notes: '' })
    setProductionModal({ open: true, product })
  }

  async function handleAddProduction(e) {
    e.preventDefault()
    const qty = parseInt(prodForm.quantity, 10)
    if (!qty || qty <= 0) {
      showToast('Jumlah produksi harus lebih dari 0', 'error')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('production_log').insert({
        product_id: productionModal.product.id,
        quantity_produced: qty,
        batch_number: prodForm.batchNumber || generateBatchNumber(),
        notes: prodForm.notes,
      })
      if (error) throw error
      showToast(`Berhasil menambahkan ${qty} unit ${productionModal.product.name}`, 'success')
      setProductionModal({ open: false, product: null })
      fetchData()
    } catch (err) {
      console.error('Production error:', err)
      showToast('Gagal menambahkan produksi: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function openHistoryModal(product) {
    setHistoryModal({ open: true, product, logs: [] })
    try {
      const { data, error } = await supabase
        .from('production_log')
        .select('*')
        .eq('product_id', product.id)
        .order('production_date', { ascending: false })
        .limit(20)
      if (error) throw error
      setHistoryModal(prev => ({ ...prev, logs: data || [] }))
    } catch (err) {
      showToast('Gagal memuat riwayat produksi', 'error')
    }
  }

  async function toggleProductStatus(product) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
      if (error) throw error
      showToast(`${product.name} ${!product.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success')
      fetchData()
    } catch (err) {
      showToast('Gagal mengubah status produk', 'error')
    }
  }

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category_id === selectedCategory)

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
            <h1>Produk</h1>
            <p>Kelola produk dan stok TEOFFE</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="filter-bar mb-lg">
        <button
          className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Semua ({products.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name} ({products.filter(p => p.category_id === cat.id).length})
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {filteredProducts.map((product, i) => (
          <div
            key={product.id}
            className={`product-card animate-slideUp stagger-${(i % 4) + 1}`}
            style={{ '--product-color': product.color_hex }}
          >
            <div className="product-card-header">
              <div>
                <div className="product-card-category">
                  ☕ {product.categories?.name || 'Uncategorized'}
                </div>
                <div className="product-card-name">{product.name}</div>
                <div className="product-card-type">{product.type}</div>
              </div>
              <div className="product-card-color" style={{ background: product.color_hex }}>
                ☕
              </div>
            </div>

            {product.tagline && (
              <div className="product-card-tagline">"{product.tagline}"</div>
            )}

            <div className="product-card-footer">
              <div className="product-card-price">{formatRupiah(product.price)}</div>
              <div className={`product-card-stock ${product.current_stock < 10 ? 'low' : 'ok'}`}>
                <span className={`stock-dot ${product.current_stock < 10 ? 'low' : 'ok'}`} />
                <span>{product.current_stock} stok</span>
              </div>
            </div>

            <div className="product-card-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => openProductionModal(product)}
                style={{ flex: 1 }}
              >
                + Produksi
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => openHistoryModal(product)}
              >
                Riwayat
              </button>
              <button
                className={`btn btn-sm ${product.is_active ? 'btn-danger' : 'btn-success'}`}
                onClick={() => toggleProductStatus(product)}
                title={product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              >
                {product.is_active ? '✕' : '✓'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Production Modal */}
      <Modal
        isOpen={productionModal.open}
        onClose={() => setProductionModal({ open: false, product: null })}
        title={`Tambah Produksi — ${productionModal.product?.name || ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setProductionModal({ open: false, product: null })}>Batal</button>
            <button className="btn btn-primary" onClick={handleAddProduction} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Produksi'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddProduction}>
          <div className="form-group">
            <label className="form-label">Jumlah Produksi (unit)</label>
            <input
              type="number"
              className="form-input"
              placeholder="Contoh: 50"
              value={prodForm.quantity}
              onChange={(e) => setProdForm(prev => ({ ...prev, quantity: e.target.value }))}
              min="1"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nomor Batch</label>
            <input
              type="text"
              className="form-input"
              value={prodForm.batchNumber}
              onChange={(e) => setProdForm(prev => ({ ...prev, batchNumber: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <textarea
              className="form-textarea"
              placeholder="Catatan produksi..."
              value={prodForm.notes}
              onChange={(e) => setProdForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginTop: '8px' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Stok saat ini</span>
              <span className="text-mono" style={{ fontWeight: 700 }}>{productionModal.product?.current_stock || 0}</span>
            </div>
            {prodForm.quantity && parseInt(prodForm.quantity) > 0 && (
              <div className="flex items-center justify-between text-sm mt-sm">
                <span className="text-muted">Stok setelah produksi</span>
                <span className="text-mono" style={{ fontWeight: 700, color: 'var(--status-success)' }}>
                  {(productionModal.product?.current_stock || 0) + parseInt(prodForm.quantity)}
                </span>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, product: null, logs: [] })}
        title={`Riwayat Produksi — ${historyModal.product?.name || ''}`}
        size="lg"
      >
        {historyModal.logs.length > 0 ? (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Batch</th>
                  <th>Jumlah</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {historyModal.logs.map(log => (
                  <tr key={log.id}>
                    <td className="text-sm">{formatDate(log.production_date)}</td>
                    <td><span className="text-mono text-sm">{log.batch_number}</span></td>
                    <td>
                      <span className="badge badge-success">+{log.quantity_produced}</span>
                    </td>
                    <td className="text-sm text-muted">{log.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-title">Belum ada riwayat produksi</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
