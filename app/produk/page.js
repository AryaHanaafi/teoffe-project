'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah } from '@/lib/utils'
import Modal from '@/components/Modal'
import { showToast } from '@/components/Toast'

const PRESET_COLORS = [
  { name: 'Sky Blue', hex: '#5BA4C9' },
  { name: 'Aren Latte', hex: '#B8956A' },
  { name: 'Butter Gold', hex: '#C2A34F' },
  { name: 'Pandan Green', hex: '#8B9E6B' },
  { name: 'Terracotta', hex: '#C08B6E' },
  { name: 'Hazelnut Dark', hex: '#7A6E5A' },
  { name: 'Berry Pink', hex: '#E040A0' },
  { name: 'Charcoal', hex: '#374151' },
]

export default function ProdukPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'

  // Modals state
  const [productModal, setProductModal] = useState({ open: false, isEdit: false, product: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null })

  // Form states
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Kopi Susu',
    tagline: '',
    price: '',
    category_id: '',
    color_hex: '#5BA4C9',
    image_url: '',
    is_active: true,
  })

  // New Category input state inside modal
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCatInput, setShowNewCatInput] = useState(false)
  const fileInputRef = useRef(null)

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

      const fetchedProducts = productsRes.data || []
      const fetchedCategories = categoriesRes.data || []

      setProducts(fetchedProducts)
      setCategories(fetchedCategories)
    } catch (err) {
      console.error('Fetch error:', err)
      showToast('Gagal memuat data produk', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle client-side image compression to Base64
  function handleImageFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (JPG, PNG, atau WebP)', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 480
        const MAX_HEIGHT = 480
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        setFormData(prev => ({ ...prev, image_url: compressedBase64 }))
        showToast('Foto produk berhasil diunggah!', 'success')
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  // Open modal Tambah Produk
  function openAddProductModal() {
    const defaultCatId = categories.length > 0 ? categories[0].id : ''
    setFormData({
      name: '',
      type: 'Kopi Susu',
      tagline: '',
      price: '',
      category_id: defaultCatId,
      color_hex: '#5BA4C9',
      image_url: '',
      is_active: true,
    })
    setShowNewCatInput(false)
    setNewCategoryName('')
    setProductModal({ open: true, isEdit: false, product: null })
  }

  // Open modal Edit Produk & Edit Harga
  function openEditProductModal(product) {
    setFormData({
      name: product.name,
      type: product.type || '',
      tagline: product.tagline || '',
      price: product.price || '',
      category_id: product.category_id || (categories[0]?.id || ''),
      color_hex: product.color_hex || '#5BA4C9',
      image_url: product.image_url || '',
      is_active: product.is_active,
    })
    setShowNewCatInput(false)
    setNewCategoryName('')
    setProductModal({ open: true, isEdit: true, product })
  }

  // Submit Tambah / Edit Produk
  async function handleSubmitProduct(e) {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Nama produk wajib diisi!', 'error')
      return
    }
    const priceNum = parseInt(formData.price, 10)
    if (!priceNum || priceNum <= 0) {
      showToast('Harga produk harus lebih dari Rp 0', 'error')
      return
    }

    setSubmitting(true)
    try {
      let finalCategoryId = formData.category_id

      // Jika user menambahkan kategori baru saat form
      if (showNewCatInput && newCategoryName.trim()) {
        const { data: newCat, error: catErr } = await supabase
          .from('categories')
          .insert({ name: newCategoryName.trim(), description: 'Kategori baru' })
          .select()
          .single()

        if (!catErr && newCat) {
          finalCategoryId = newCat.id
          setCategories(prev => [...prev, newCat])
        }
      }

      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')

      if (productModal.isEdit) {
        // UPDATE PRODUK
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name.trim(),
            type: formData.type.trim(),
            tagline: formData.tagline.trim(),
            price: priceNum,
            category_id: finalCategoryId || null,
            color_hex: formData.color_hex,
            image_url: formData.image_url,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productModal.product.id)

        if (error) throw error
        showToast(`Produk "${formData.name}" berhasil diperbarui!`, 'success')
      } else {
        // INSERT PRODUK BARU
        const { error } = await supabase
          .from('products')
          .insert([
            {
              name: formData.name.trim(),
              slug: slug + '-' + Date.now().toString().slice(-4),
              type: formData.type.trim() || 'Minuman',
              tagline: formData.tagline.trim(),
              price: priceNum,
              category_id: finalCategoryId || null,
              color_hex: formData.color_hex,
              image_url: formData.image_url,
              is_active: formData.is_active,
              current_stock: 0,
            }
          ])

        if (error) throw error
        showToast(`Produk baru "${formData.name}" berhasil ditambahkan!`, 'success')
      }

      setProductModal({ open: false, isEdit: false, product: null })
      fetchData()
    } catch (err) {
      console.error('Save product error:', err)
      showToast('Gagal menyimpan produk: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Hapus Produk
  async function handleDeleteProduct() {
    if (!deleteModal.product) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteModal.product.id)

      if (error) {
        // Jika ada foreign key di order_items, tawarkan nonaktifkan produk
        if (error.code === '23503') {
          await supabase.from('products').update({ is_active: false }).eq('id', deleteModal.product.id)
          showToast(`Produk memiliki riwayat transaksi, status telah diubah menjadi NONAKTIF.`, 'warning')
        } else {
          throw error
        }
      } else {
        showToast(`Produk "${deleteModal.product.name}" berhasil dihapus!`, 'success')
      }

      setDeleteModal({ open: false, product: null })
      fetchData()
    } catch (err) {
      showToast('Gagal menghapus produk: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Aktif / Nonaktif
  async function toggleProductStatus(product) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)
      if (error) throw error
      showToast(`${product.name} ${!product.is_active ? 'diaktifkan (muncul di kasir)' : 'dinonaktifkan (disembunyikan dari kasir)'}`, 'success')
      fetchData()
    } catch (err) {
      showToast('Gagal mengubah status: ' + err.message, 'error')
    }
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false

      // Status filter
      if (statusFilter === 'active' && !p.is_active) return false
      if (statusFilter === 'inactive' && p.is_active) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (p.name || '').toLowerCase().includes(q)
        const matchType = (p.type || '').toLowerCase().includes(q)
        const matchTagline = (p.tagline || '').toLowerCase().includes(q)
        if (!matchName && !matchType && !matchTagline) return false
      }

      return true
    })
  }, [products, selectedCategory, statusFilter, searchQuery])

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '60vh' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Katalog Produk & Menu TEOFFE</h1>
            <p>Kelola menu, foto, harga jual, dan status ketersediaan di kasir</p>
          </div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={openAddProductModal}>
              ➕ Tambah Produk Baru
            </button>
            <button className="btn btn-secondary" onClick={fetchData} title="Refresh Data">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
        {/* Category Filters */}
        <div className="filter-bar">
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

        {/* Search and Status Dropdown */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
          >
            <option value="all">Semua Status</option>
            <option value="active">🟢 Hanya Aktif (Tersedia)</option>
            <option value="inactive">🔴 Hanya Nonaktif (Kosong)</option>
          </select>

          <div className="search-bar">
            <span className="search-bar-icon">🔍</span>
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama menu / varian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', maxWidth: '240px', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="products-grid">
          {filteredProducts.map((product, i) => (
            <div
              key={product.id}
              className={`product-card animate-slideUp stagger-${(i % 4) + 1}`}
              style={{
                '--product-color': product.color_hex || '#5BA4C9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0',
                overflow: 'hidden',
                opacity: product.is_active ? 1 : 0.7,
                border: !product.is_active ? '1px dashed var(--border-color)' : undefined,
              }}
            >
              {/* Product Image / Color Banner - Uniform Height */}
              <div
                style={{
                  height: '135px',
                  width: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  background: product.image_url
                    ? 'var(--bg-elevated)'
                    : `linear-gradient(135deg, ${product.color_hex || '#5BA4C9'}26, ${product.color_hex || '#5BA4C9'}66)`,
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '2.2rem', display: 'block', opacity: 0.85 }}>☕</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      TEOFFE Blend
                    </span>
                  </div>
                )}

                {/* Top Badges */}
                <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  <span
                    className="badge badge-default"
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(10, 10, 20, 0.75)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {product.categories?.name || 'Menu'}
                  </span>
                </div>

                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <span
                    className={`badge ${product.is_active ? 'badge-success' : 'badge-error'}`}
                    style={{
                      fontSize: '0.68rem',
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                  >
                    {product.is_active ? '● Tersedia' : '● Nonaktif'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: product.color_hex || '#5BA4C9', flexShrink: 0 }} />
                    <span className="text-xs text-muted" style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                      {product.type || 'Signature'}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      marginBottom: '4px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  <p
                    className="text-xs text-muted"
                    style={{
                      fontStyle: 'italic',
                      marginBottom: '10px',
                      minHeight: '18px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={product.tagline || ''}
                  >
                    {product.tagline ? `"${product.tagline}"` : '—'}
                  </p>
                </div>

                {/* Price and Actions Footer */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                    <div>
                      <span className="text-xs text-muted" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Harga Jual
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--teoffe-primary)', fontFamily: 'var(--font-heading)' }}>
                        {formatRupiah(product.price)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => openEditProductModal(product)}
                      style={{ flex: 1, padding: '6px 8px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={`btn btn-xs ${product.is_active ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => toggleProductStatus(product)}
                      style={{ padding: '6px 10px' }}
                      title={product.is_active ? 'Sembunyikan menu dari kasir' : 'Munculkan menu di kasir'}
                    >
                      {product.is_active ? '⏸️ Nonaktif' : '▶️ Aktifkan'}
                    </button>
                    <button
                      className="btn btn-xs btn-danger"
                      onClick={() => setDeleteModal({ open: true, product })}
                      title="Hapus Menu"
                      style={{ padding: '6px 8px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">☕</div>
          <p className="empty-state-title">Tidak ada produk ditemukan</p>
          <p className="empty-state-text">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'Coba sesuaikan kata kunci pencarian atau filter kategori.'
              : 'Belum ada produk terdaftar. Klik "Tambah Produk Baru" untuk menambahkan menu pertama Anda.'}
          </p>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PRODUK */}
      <Modal
        isOpen={productModal.open}
        onClose={() => setProductModal({ open: false, isEdit: false, product: null })}
        title={productModal.isEdit ? `Edit Menu — ${productModal.product?.name}` : 'Tambah Produk / Menu Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmitProduct}>
          {/* Foto Produk Section */}
          <div style={{ marginBottom: '16px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <label className="form-label font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              📸 Foto / Gambar Menu
            </label>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '8px' }}>
              {/* Image Preview Box */}
              <div
                style={{
                  width: '90px', height: '90px', borderRadius: 'var(--radius-sm)',
                  border: '2px dashed var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {formData.image_url ? (
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '2rem', opacity: 0.5 }}>☕</span>
                )}
              </div>

              {/* Upload & Link Controls */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0])
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Unggah Foto dari Komputer
                  </button>
                  {formData.image_url && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Atau tempel Link / URL Gambar online..."
                    value={formData.image_url.startsWith('data:') ? '(Foto lokal terunggah)' : formData.image_url}
                    disabled={formData.image_url.startsWith('data:')}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-row mb-sm">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Nama Menu / Produk *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Contoh: Basically OG / Caramel Macchiato"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Harga Jual (Rp) *</label>
              <input
                type="number"
                required
                min="100"
                className="form-input"
                placeholder="20000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--teoffe-primary)' }}
              />
            </div>
          </div>

          <div className="form-row mb-sm">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Kategori</label>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  style={{ textDecoration: 'underline' }}
                >
                  {showNewCatInput ? 'Pilih yang ada' : '+ Kategori Baru'}
                </button>
              </div>

              {showNewCatInput ? (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ketik nama kategori baru..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                />
              ) : (
                <select
                  className="form-select"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Tipe / Varian (Sub-title)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Aren Latte / Cold Brew / Pastry"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group mb-sm">
            <label className="form-label">Tagline / Deskripsi Singkat</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: The OG. No explanation needed."
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            />
          </div>

          {/* Color Picker & Status */}
          <div className="form-row mb-lg">
            <div className="form-group">
              <label className="form-label">Warna Aksen Menu</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setFormData({ ...formData, color_hex: c.hex })}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: c.hex,
                      border: formData.color_hex === c.hex ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: formData.color_hex === c.hex ? '0 0 8px ' + c.hex : 'none',
                    }}
                    title={c.name}
                  />
                ))}
                <input
                  type="color"
                  value={formData.color_hex}
                  onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                  style={{ width: '32px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status di Kasir</label>
              <select
                className="form-select"
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              >
                <option value="active">🟢 Aktif (Tersedia & Muncul di Kasir)</option>
                <option value="inactive">🔴 Nonaktif (Kosong & Disembunyikan)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setProductModal({ open: false, isEdit: false, product: null })}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : productModal.isEdit ? 'Simpan Perubahan' : 'Tambah Menu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: KONFIRMASI HAPUS PRODUK */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null })}
        title="Konfirmasi Hapus Menu"
        size="sm"
      >
        <p className="text-sm mb-md">
          Apakah Anda yakin ingin menghapus menu <b>{deleteModal.product?.name}</b>?
        </p>
        <p className="text-xs text-muted mb-lg">
          *Catatan: Jika menu ini pernah dipesan sebelumnya, sistem akan menonaktifkannya secara otomatis agar laporan riwayat kasir sebelumnya tetap konsisten.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setDeleteModal({ open: false, product: null })}
          >
            Batal
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDeleteProduct}
            disabled={submitting}
          >
            {submitting ? 'Menghapus...' : 'Hapus Menu'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
