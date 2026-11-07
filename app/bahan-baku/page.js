'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatRupiah, formatNumber, formatUnitCost, formatDate, toCSV, downloadFile } from '@/lib/utils'
import Modal from '@/components/Modal'
import { showToast } from '@/components/Toast'

// Data awal bahan baku sesuai spesifikasi user
const INITIAL_MATERIALS = [
  {
    id: 'mat-1',
    name: 'Biji Kopi',
    category: 'Kopi & Espresso',
    unit: 'g',
    package_size: 1000,
    cost_price: 177000,
    unit_cost: 177,
    current_stock: 3000,
    minimum_stock: 500,
    notes: 'Hostblend 70:30',
    icon: '☕',
  },
  {
    id: 'mat-2',
    name: 'Krimer',
    category: 'Dairy & Krimer',
    unit: 'g',
    package_size: 1000,
    cost_price: 35000,
    unit_cost: 35,
    current_stock: 2000,
    minimum_stock: 500,
    notes: 'Krimer bubuk regular',
    icon: '🥛',
  },
  {
    id: 'mat-3',
    name: 'Max Krimer',
    category: 'Dairy & Krimer',
    unit: 'g',
    package_size: 500,
    cost_price: 44000,
    unit_cost: 88,
    current_stock: 1000,
    minimum_stock: 250,
    notes: 'Max Krimer 500g',
    icon: '🥛',
  },
  {
    id: 'mat-4',
    name: 'SKM (Susu Kental Manis)',
    category: 'Dairy & Krimer',
    unit: 'g',
    package_size: 250,
    cost_price: 14000,
    unit_cost: 56,
    current_stock: 1000,
    minimum_stock: 250,
    notes: 'Susu kental manis kaleng/pouch 250g',
    icon: '🥛',
  },
  {
    id: 'mat-5',
    name: 'Air Mineral (Galon)',
    category: 'Air & Liquid Base',
    unit: 'ml',
    package_size: 19000,
    cost_price: 21000,
    unit_cost: 1.1,
    current_stock: 38000,
    minimum_stock: 19000,
    notes: 'Galon 19 Liter (~Rp 1/ml)',
    icon: '💧',
  },
  {
    id: 'mat-6',
    name: 'Susu Diamond',
    category: 'Dairy & Krimer',
    unit: 'ml',
    package_size: 1000,
    cost_price: 19000,
    unit_cost: 19,
    current_stock: 5000,
    minimum_stock: 2000,
    notes: 'Diamond Fresh Milk 1000ml',
    icon: '🥛',
  },
  {
    id: 'mat-7',
    name: 'Simple Syrup',
    category: 'Sirup & Pemanis',
    unit: 'ml',
    package_size: 15,
    cost_price: 166,
    unit_cost: 11,
    current_stock: 2000,
    minimum_stock: 300,
    notes: 'Gula cair (Rp 166 per 15ml takaran saji)',
    icon: '🍯',
  },
  {
    id: 'mat-8',
    name: 'Aren Syrup',
    category: 'Sirup & Pemanis',
    unit: 'ml',
    package_size: 1000,
    cost_price: 70980,
    unit_cost: 71,
    current_stock: 3000,
    minimum_stock: 1000,
    notes: 'Gula aren cair murni 1000ml',
    icon: '🍯',
  },
  {
    id: 'mat-9',
    name: 'Butter Syrup',
    category: 'Sirup & Pemanis',
    unit: 'ml',
    package_size: 750,
    cost_price: 71956,
    unit_cost: 96,
    current_stock: 1500,
    minimum_stock: 500,
    notes: 'Butterscotch syrup 750ml',
    icon: '🍯',
  },
  {
    id: 'mat-10',
    name: 'Pandan Syrup',
    category: 'Sirup & Pemanis',
    unit: 'ml',
    package_size: 500,
    cost_price: 55550,
    unit_cost: 111,
    current_stock: 1000,
    minimum_stock: 250,
    notes: 'Pandan flavor syrup 500ml',
    icon: '🌿',
  },
  {
    id: 'mat-11',
    name: 'Pack 250ml',
    category: 'Kemasan & Packaging',
    unit: 'pcs',
    package_size: 1,
    cost_price: 2234,
    unit_cost: 2234,
    current_stock: 250,
    minimum_stock: 50,
    notes: 'Cup / Botol kemasan 250ml siap pakai (isi 9 pcs ~ Rp 20.106)',
    icon: '📦',
  },
]

const CATEGORIES = [
  'Semua',
  'Kopi & Espresso',
  'Dairy & Krimer',
  'Sirup & Pemanis',
  'Air & Base',
  'Kemasan & Packaging',
  'Lainnya',
]

// Preset Resep Minuman TEOFFE untuk kalkulasi HPP otomatis
const DRINK_PRESETS = [
  {
    name: 'Basically OG (Kopi Susu Original)',
    sellingPrice: 18000,
    recipe: [
      { materialName: 'Biji Kopi', amount: 18 },
      { materialName: 'Susu Diamond', amount: 120 },
      { materialName: 'Krimer', amount: 15 },
      { materialName: 'SKM (Susu Kental Manis)', amount: 20 },
      { materialName: 'Simple Syrup', amount: 10 },
      { materialName: 'Pack 250ml', amount: 1 },
    ],
  },
  {
    name: 'Aren Things (Kopi Susu Gula Aren)',
    sellingPrice: 20000,
    recipe: [
      { materialName: 'Biji Kopi', amount: 18 },
      { materialName: 'Susu Diamond', amount: 120 },
      { materialName: 'Aren Syrup', amount: 25 },
      { materialName: 'Krimer', amount: 15 },
      { materialName: 'Pack 250ml', amount: 1 },
    ],
  },
  {
    name: 'Butter Me Up (Butterscotch Coffee)',
    sellingPrice: 22000,
    recipe: [
      { materialName: 'Biji Kopi', amount: 18 },
      { materialName: 'Susu Diamond', amount: 110 },
      { materialName: 'Butter Syrup', amount: 25 },
      { materialName: 'Max Krimer', amount: 15 },
      { materialName: 'Pack 250ml', amount: 1 },
    ],
  },
  {
    name: 'Pandan Club (Pandan Coffee Latte)',
    sellingPrice: 22000,
    recipe: [
      { materialName: 'Biji Kopi', amount: 18 },
      { materialName: 'Susu Diamond', amount: 110 },
      { materialName: 'Pandan Syrup', amount: 25 },
      { materialName: 'Krimer', amount: 15 },
      { materialName: 'Pack 250ml', amount: 1 },
    ],
  },
]

export default function BahanBakuPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState([])
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory' | 'calculator' | 'logs'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'safe' | 'low' | 'empty'

  // Modals state
  const [materialModal, setMaterialModal] = useState({ open: false, isEdit: false, data: null })
  const [stockModal, setStockModal] = useState({ open: false, material: null, type: 'in', amount: '', notes: '', packageUnits: '' })
  const [deleteModal, setDeleteModal] = useState({ open: false, material: null })
  const [submitting, setSubmitting] = useState(false)

  // Calculator state
  const [selectedPreset, setSelectedPreset] = useState(DRINK_PRESETS[0].name)
  const [customRecipe, setCustomRecipe] = useState(DRINK_PRESETS[0].recipe)
  const [calculatorSellingPrice, setCalculatorSellingPrice] = useState(DRINK_PRESETS[0].sellingPrice)

  // Form state untuk Add/Edit Material
  const [formData, setFormData] = useState({
    name: '',
    category: 'Kopi & Espresso',
    unit: 'g',
    package_size: 1000,
    cost_price: 0,
    unit_cost: 0,
    is_custom_unit_cost: false,
    current_stock: 0,
    minimum_stock: 200,
    notes: '',
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  // Sinkronisasi data dari Supabase dengan fallback LocalStorage
  async function fetchMaterials() {
    setLoading(true)
    try {
      // 1. Coba fetch dari Supabase
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name')

      if (error || !data || data.length === 0) {
        // Fallback ke localStorage atau INITIAL_MATERIALS
        const local = localStorage.getItem('teoffe_raw_materials')
        if (local) {
          try {
            setMaterials(JSON.parse(local))
          } catch {
            setMaterials(INITIAL_MATERIALS)
          }
        } else {
          setMaterials(INITIAL_MATERIALS)
          localStorage.setItem('teoffe_raw_materials', JSON.stringify(INITIAL_MATERIALS))
        }
      } else {
        setMaterials(data)
        localStorage.setItem('teoffe_raw_materials', JSON.stringify(data))
      }

      // Fetch logs jika tabel ada
      const logsRes = await supabase
        .from('raw_material_logs')
        .select('*, raw_materials(name, unit)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (logsRes.data) {
        setLogs(logsRes.data)
      } else {
        const localLogs = localStorage.getItem('teoffe_raw_material_logs')
        if (localLogs) setLogs(JSON.parse(localLogs))
      }
    } catch (err) {
      console.error('Fetch error:', err)
      const local = localStorage.getItem('teoffe_raw_materials')
      setMaterials(local ? JSON.parse(local) : INITIAL_MATERIALS)
    } finally {
      setLoading(false)
    }
  }

  // Simpan data (Update state & LocalStorage + Supabase)
  async function saveMaterialsState(updatedList, newLog = null) {
    setMaterials(updatedList)
    localStorage.setItem('teoffe_raw_materials', JSON.stringify(updatedList))

    if (newLog) {
      const updatedLogs = [newLog, ...logs].slice(0, 50)
      setLogs(updatedLogs)
      localStorage.setItem('teoffe_raw_material_logs', JSON.stringify(updatedLogs))
    }
  }

  // Helper kalkulasi unit cost otomatis saat form diisi
  function calculateAutoUnitCost(costPrice, packageSize) {
    const cost = parseFloat(costPrice) || 0
    const size = parseFloat(packageSize) || 1
    if (size <= 0) return 0
    const raw = cost / size
    return raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10
  }

  // Handle buka Modal Tambah Bahan
  function openAddModal() {
    setFormData({
      name: '',
      category: 'Kopi & Espresso',
      unit: 'g',
      package_size: 1000,
      cost_price: '',
      unit_cost: '',
      is_custom_unit_cost: false,
      current_stock: 0,
      minimum_stock: 200,
      notes: '',
    })
    setMaterialModal({ open: true, isEdit: false, data: null })
  }

  // Handle buka Modal Edit Bahan
  function openEditModal(mat) {
    setFormData({
      name: mat.name,
      category: mat.category || 'Lainnya',
      unit: mat.unit || 'g',
      package_size: mat.package_size || 1000,
      cost_price: mat.cost_price || 0,
      unit_cost: mat.unit_cost || 0,
      is_custom_unit_cost: false,
      current_stock: mat.current_stock || 0,
      minimum_stock: mat.minimum_stock || 0,
      notes: mat.notes || '',
    })
    setMaterialModal({ open: true, isEdit: true, data: mat })
  }

  // Submit Tambah / Edit Bahan
  async function handleSubmitMaterial(e) {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Nama bahan harus diisi!', 'error')
      return
    }

    const packageSize = parseFloat(formData.package_size) || 1
    const costPrice = parseFloat(formData.cost_price) || 0
    const finalUnitCost = formData.is_custom_unit_cost && formData.unit_cost !== ''
      ? parseFloat(formData.unit_cost)
      : calculateAutoUnitCost(costPrice, packageSize)

    setSubmitting(true)
    try {
      if (materialModal.isEdit) {
        // Update existing
        const targetId = materialModal.data.id
        const updatedItem = {
          ...materialModal.data,
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit,
          package_size: packageSize,
          cost_price: costPrice,
          unit_cost: finalUnitCost,
          current_stock: parseFloat(formData.current_stock) || 0,
          minimum_stock: parseFloat(formData.minimum_stock) || 0,
          notes: formData.notes.trim(),
          updated_at: new Date().toISOString(),
        }

        // Coba simpan ke Supabase jika ada id UUID
        if (!targetId.startsWith('mat-')) {
          await supabase.from('raw_materials').update(updatedItem).eq('id', targetId)
        }

        const nextMaterials = materials.map(m => m.id === targetId ? updatedItem : m)
        saveMaterialsState(nextMaterials)
        showToast(`Bahan ${formData.name} berhasil diperbarui!`, 'success')
      } else {
        // Tambah baru
        const newItem = {
          id: 'mat-' + Date.now(),
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit,
          package_size: packageSize,
          cost_price: costPrice,
          unit_cost: finalUnitCost,
          current_stock: parseFloat(formData.current_stock) || 0,
          minimum_stock: parseFloat(formData.minimum_stock) || 0,
          notes: formData.notes.trim(),
          created_at: new Date().toISOString(),
        }

        // Coba insert ke Supabase
        try {
          const { data } = await supabase.from('raw_materials').insert([
            {
              name: newItem.name,
              category: newItem.category,
              unit: newItem.unit,
              package_size: newItem.package_size,
              cost_price: newItem.cost_price,
              unit_cost: newItem.unit_cost,
              current_stock: newItem.current_stock,
              minimum_stock: newItem.minimum_stock,
              notes: newItem.notes,
            }
          ]).select().single()
          if (data && data.id) newItem.id = data.id
        } catch {
          // Ignore, fallback to local id
        }

        const nextMaterials = [...materials, newItem]
        saveMaterialsState(nextMaterials)
        showToast(`Bahan ${formData.name} berhasil ditambahkan!`, 'success')
      }

      setMaterialModal({ open: false, isEdit: false, data: null })
    } catch (err) {
      console.error(err)
      showToast('Gagal menyimpan bahan: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Hapus Bahan
  async function handleDeleteMaterial() {
    if (!deleteModal.material) return
    const id = deleteModal.material.id
    try {
      if (!id.startsWith('mat-')) {
        await supabase.from('raw_materials').delete().eq('id', id)
      }
      const next = materials.filter(m => m.id !== id)
      saveMaterialsState(next)
      showToast(`Bahan ${deleteModal.material.name} telah dihapus`, 'info')
      setDeleteModal({ open: false, material: null })
    } catch (err) {
      showToast('Gagal menghapus: ' + err.message, 'error')
    }
  }

  // Handle Update Stok Cepat (Restock / Pengurangan)
  async function handleQuickStockAdjust(e) {
    e.preventDefault()
    const { material, type, amount, notes, packageUnits } = stockModal
    if (!material) return

    let changeQty = 0
    if (packageUnits && parseFloat(packageUnits) > 0) {
      changeQty = parseFloat(packageUnits) * (material.package_size || 1)
    } else {
      changeQty = parseFloat(amount) || 0
    }

    if (changeQty <= 0) {
      showToast('Jumlah perubahan stok harus lebih dari 0', 'error')
      return
    }

    const current = material.current_stock || 0
    const newStock = type === 'in' ? current + changeQty : Math.max(0, current - changeQty)

    setSubmitting(true)
    try {
      const updatedMat = { ...material, current_stock: newStock, updated_at: new Date().toISOString() }

      // Catat log mutasi
      const logEntry = {
        id: 'log-' + Date.now(),
        material_id: material.id,
        material_name: material.name,
        unit: material.unit,
        change_type: type,
        quantity: changeQty,
        stock_before: current,
        stock_after: newStock,
        notes: notes || (type === 'in' ? 'Restock bahan baku' : 'Pengurangan/pemakaian bahan'),
        created_at: new Date().toISOString(),
      }

      if (!material.id.startsWith('mat-')) {
        await supabase.from('raw_materials').update({ current_stock: newStock }).eq('id', material.id)
        try {
          await supabase.from('raw_material_logs').insert([{
            material_id: material.id,
            change_type: type,
            quantity: changeQty,
            stock_before: current,
            stock_after: newStock,
            notes: logEntry.notes,
          }])
        } catch {}
      }

      const next = materials.map(m => m.id === material.id ? updatedMat : m)
      saveMaterialsState(next, logEntry)

      showToast(
        type === 'in'
          ? `Berhasil restock ${formatNumber(changeQty)} ${material.unit} ${material.name}`
          : `Stok ${material.name} dikurangi ${formatNumber(changeQty)} ${material.unit}`,
        'success'
      )
      setStockModal({ open: false, material: null, type: 'in', amount: '', notes: '', packageUnits: '' })
    } catch (err) {
      showToast('Gagal update stok: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Kalkulator HPP Preset change
  function handlePresetChange(presetName) {
    setSelectedPreset(presetName)
    const preset = DRINK_PRESETS.find(p => p.name === presetName)
    if (preset) {
      setCustomRecipe(preset.recipe)
      setCalculatorSellingPrice(preset.sellingPrice)
    }
  }

  // Update takaran bahan di kalkulator
  function updateRecipeItemAmount(index, amount) {
    setCustomRecipe(prev => {
      const next = [...prev]
      next[index] = { ...next[index], amount: Math.max(0, parseFloat(amount) || 0) }
      return next
    })
  }

  // Tambah baris bahan di kalkulator
  function addRecipeItem() {
    const available = materials.find(m => !customRecipe.some(r => r.materialName === m.name)) || materials[0]
    if (!available) return
    setCustomRecipe(prev => [...prev, { materialName: available.name, amount: 10 }])
  }

  // Hapus baris bahan di kalkulator
  function removeRecipeItem(index) {
    setCustomRecipe(prev => prev.filter((_, i) => i !== index))
  }

  // Total HPP Resep Terkalkulasi
  const recipeCalculation = useMemo(() => {
    let totalHPP = 0
    const details = customRecipe.map(item => {
      const mat = materials.find(m => m.name.toLowerCase() === item.materialName.toLowerCase())
      const unitCost = mat ? mat.unit_cost : 0
      const subtotal = (item.amount || 0) * unitCost
      totalHPP += subtotal
      return {
        ...item,
        unit: mat ? mat.unit : 'g',
        unitCost,
        subtotal: Math.round(subtotal),
        availableStock: mat ? mat.current_stock : 0,
      }
    })

    const sellingPrice = parseFloat(calculatorSellingPrice) || 0
    const profit = sellingPrice - totalHPP
    const marginPercent = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : 0

    return { totalHPP: Math.round(totalHPP), details, sellingPrice, profit: Math.round(profit), marginPercent }
  }, [customRecipe, materials, calculatorSellingPrice])

  // Computed KPI Stats
  const stats = useMemo(() => {
    const totalMaterials = materials.length
    const totalValuation = materials.reduce((sum, m) => sum + ((m.current_stock || 0) * (m.unit_cost || 0)), 0)
    const lowStockCount = materials.filter(m => (m.current_stock || 0) <= (m.minimum_stock || 0) && (m.current_stock || 0) > 0).length
    const emptyStockCount = materials.filter(m => (m.current_stock || 0) <= 0).length

    // Coffee beans ready cups estimate (misal 18g per cup)
    const coffeeMat = materials.find(m => m.name.toLowerCase().includes('kopi'))
    const cupsEstimate = coffeeMat ? Math.floor((coffeeMat.current_stock || 0) / 18) : 0

    return { totalMaterials, totalValuation: Math.round(totalValuation), lowStockCount, emptyStockCount, cupsEstimate }
  }, [materials])

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(mat => {
      // Category filter
      if (selectedCategory !== 'Semua' && mat.category !== selectedCategory) return false

      // Status filter
      const stock = mat.current_stock || 0
      const min = mat.minimum_stock || 0
      if (statusFilter === 'safe' && stock <= min) return false
      if (statusFilter === 'low' && (stock > min || stock <= 0)) return false
      if (statusFilter === 'empty' && stock > 0) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = mat.name.toLowerCase().includes(q)
        const matchNotes = (mat.notes || '').toLowerCase().includes(q)
        const matchCategory = (mat.category || '').toLowerCase().includes(q)
        if (!matchName && !matchNotes && !matchCategory) return false
      }

      return true
    })
  }, [materials, selectedCategory, statusFilter, searchQuery])

  // Export CSV Data Bahan Baku
  function handleExportCSV() {
    const data = materials.map(m => ({
      nama: m.name,
      kategori: m.category,
      satuan: m.unit,
      kemasan: `${formatNumber(m.package_size)} ${m.unit}`,
      harga_modal: m.cost_price,
      harga_per_satuan: m.unit_cost,
      stok_saat_ini: m.current_stock,
      nilai_stok: Math.round((m.current_stock || 0) * (m.unit_cost || 0)),
      stok_minimum: m.minimum_stock,
      status: (m.current_stock || 0) <= 0 ? 'Habis' : (m.current_stock || 0) <= (m.minimum_stock || 0) ? 'Menipis' : 'Aman',
      keterangan: m.notes || '-',
    }))

    const columns = [
      { key: 'nama', label: 'Nama Bahan' },
      { key: 'kategori', label: 'Kategori' },
      { key: 'satuan', label: 'Satuan' },
      { key: 'kemasan', label: 'Kemasan Beli' },
      { key: 'harga_modal', label: 'Harga Modal (Rp)' },
      { key: 'harga_per_satuan', label: 'Harga/Satuan (Rp)' },
      { key: 'stok_saat_ini', label: 'Stok Fisik' },
      { key: 'nilai_stok', label: 'Total Nilai Stok (Rp)' },
      { key: 'stok_minimum', label: 'Batas Minimum' },
      { key: 'status', label: 'Status' },
      { key: 'keterangan', label: 'Keterangan' },
    ]

    const dateStr = new Date().toISOString().slice(0, 10)
    downloadFile(toCSV(data, columns), `stok-bahan-baku-teoffe-${dateStr}.csv`)
    showToast('Laporan stok bahan baku berhasil diunduh!', 'success')
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
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Stok Bahan Baku & HPP</h1>
            <p>Kelola inventaris bahan baku, harga modal, dan kalkulasi HPP per gram/ml TEOFFE</p>
          </div>
          <div className="btn-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={openAddModal}>
              ➕ Tambah Bahan
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              📥 Ekspor CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={fetchMaterials} title="Muat Ulang Data">
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="filter-bar mb-lg" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          className={`filter-chip ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
          style={{ fontSize: '0.9rem', padding: '8px 16px' }}
        >
          🥫 Inventaris Bahan Baku ({materials.length})
        </button>
        <button
          className={`filter-chip ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
          style={{ fontSize: '0.9rem', padding: '8px 16px' }}
        >
          🧮 Kalkulator HPP Minuman
        </button>
        <button
          className={`filter-chip ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
          style={{ fontSize: '0.9rem', padding: '8px 16px' }}
        >
          📜 Riwayat Mutasi ({logs.length})
        </button>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* KPI Stats Cards */}
          <div className="stats-grid mb-lg">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Nilai Stok Bahan</span>
                <span className="stat-card-icon">💰</span>
              </div>
              <div className="stat-card-value">{formatRupiah(stats.totalValuation)}</div>
              <div className="stat-card-change positive">
                {stats.totalMaterials} jenis bahan terdaftar
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Status Restock</span>
                <span className="stat-card-icon">⚠️</span>
              </div>
              <div className="stat-card-value" style={{ color: stats.emptyStockCount > 0 ? 'var(--status-error)' : stats.lowStockCount > 0 ? 'var(--status-warning)' : 'var(--status-success)' }}>
                {stats.emptyStockCount > 0
                  ? `${stats.emptyStockCount} Habis`
                  : stats.lowStockCount > 0
                    ? `${stats.lowStockCount} Menipis`
                    : 'Semua Aman'}
              </div>
              <div className="stat-card-change">
                {stats.lowStockCount + stats.emptyStockCount} bahan perlu diperhatikan
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Estimasi Kopi Siap Saji</span>
                <span className="stat-card-icon">☕</span>
              </div>
              <div className="stat-card-value">{formatNumber(stats.cupsEstimate)} Cup</div>
              <div className="stat-card-change positive">
                Berdasarkan takaran 18g per cup
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Kategori Terbanyak</span>
                <span className="stat-card-icon">🥛</span>
              </div>
              <div className="stat-card-value">Dairy & Sirup</div>
              <div className="stat-card-change">
                Komponen utama racikan rasa
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex items-center justify-between gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
            {/* Category Filter Chips */}
            <div className="filter-bar">
              {CATEGORIES.map(cat => {
                const count = cat === 'Semua' ? materials.length : materials.filter(m => m.category === cat).length
                return (
                  <button
                    key={cat}
                    className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>

            {/* Search & Status Controls */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
              >
                <option value="all">Semua Status</option>
                <option value="safe">✅ Stok Aman</option>
                <option value="low">⚠️ Stok Menipis</option>
                <option value="empty">❌ Stok Habis</option>
              </select>

              <div className="search-bar">
                <span className="search-bar-icon">🔍</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Cari bahan / catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px', maxWidth: '240px', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Data Table Bahan Baku */}
          <div className="table-container">
            {filteredMaterials.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bahan & Kategori</th>
                    <th>Kemasan Beli</th>
                    <th>Harga Modal</th>
                    <th>Harga / Satuan</th>
                    <th>Stok Saat Ini</th>
                    <th>Nilai Stok</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map(mat => {
                    const stock = mat.current_stock || 0
                    const min = mat.minimum_stock || 0
                    const isOutOfStock = stock <= 0
                    const isLowStock = !isOutOfStock && stock <= min
                    const stockValuation = Math.round(stock * (mat.unit_cost || 0))

                    return (
                      <tr key={mat.id}>
                        {/* Bahan & Kategori */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{mat.icon || '🥫'}</span>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mat.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                  {mat.category}
                                </span>
                                {mat.notes && (
                                  <span className="text-xs text-muted" title={mat.notes}>
                                    • {mat.notes.length > 30 ? mat.notes.slice(0, 30) + '...' : mat.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kemasan Beli */}
                        <td>
                          <span className="text-sm">
                            {formatNumber(mat.package_size)} {mat.unit}
                          </span>
                        </td>

                        {/* Harga Modal Kemasan */}
                        <td>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatRupiah(mat.cost_price)}
                          </span>
                        </td>

                        {/* Harga per Satuan (HPP/Unit) */}
                        <td>
                          <span
                            className="text-mono"
                            style={{
                              fontWeight: 700,
                              color: 'var(--teoffe-primary)',
                              background: 'var(--bg-elevated)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              border: '1px solid var(--border-accent)',
                            }}
                          >
                            {formatUnitCost(mat.unit_cost, mat.unit)}
                          </span>
                        </td>

                        {/* Stok Saat Ini */}
                        <td>
                          <div>
                            <span
                              className="text-mono"
                              style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: isOutOfStock ? 'var(--status-error)' : isLowStock ? 'var(--status-warning)' : 'var(--text-primary)',
                              }}
                            >
                              {formatNumber(stock)} {mat.unit}
                            </span>
                            <div className="text-xs text-muted">
                              Min: {formatNumber(min)} {mat.unit}
                            </div>
                          </div>
                        </td>

                        {/* Nilai Stok */}
                        <td>
                          <span className="text-mono text-sm" style={{ fontWeight: 600 }}>
                            {formatRupiah(stockValuation)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          {isOutOfStock ? (
                            <span className="badge badge-error">Habis</span>
                          ) : isLowStock ? (
                            <span className="badge badge-warning">Menipis</span>
                          ) : (
                            <span className="badge badge-success">Aman</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => setStockModal({ open: true, material: mat, type: 'in', amount: '', notes: '', packageUnits: '' })}
                              title="Restock / Sesuaikan Stok"
                            >
                              📦 Atur Stok
                            </button>
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => openEditModal(mat)}
                              title="Edit Harga & Bahan"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn btn-xs btn-danger"
                              onClick={() => setDeleteModal({ open: true, material: mat })}
                              title="Hapus Bahan"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🥫</div>
                <p className="empty-state-title">Tidak ada bahan baku ditemukan</p>
                <p className="empty-state-text">
                  {searchQuery || selectedCategory !== 'Semua' || statusFilter !== 'all'
                    ? 'Coba sesuaikan kata kunci pencarian atau filter kategori'
                    : 'Belum ada bahan baku. Klik tombol "Tambah Bahan" di atas untuk menambahkan.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB KALKULATOR HPP */}
      {activeTab === 'calculator' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Sisi Kiri: Pilihan Resep & Komposisi Bahan */}
            <div className="stat-card" style={{ padding: '20px', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🧮 Racikan Resep & Takaran</h3>
                <button className="btn btn-xs btn-primary" onClick={addRecipeItem}>
                  ➕ Tambah Bahan
                </button>
              </div>

              {/* Pilihan Preset Minuman Teoffe */}
              <div className="form-group mb-md">
                <label className="form-label">Pilih Menu Preset Teoffe:</label>
                <select
                  className="form-select"
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  {DRINK_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                  <option value="custom">-- Buat Racikan Baru Sendiri --</option>
                </select>
              </div>

              {/* Tabel Komposisi Bahan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {customRecipe.map((item, idx) => {
                  const mat = materials.find(m => m.name.toLowerCase() === item.materialName.toLowerCase())
                  const unit = mat ? mat.unit : 'g'
                  const unitCost = mat ? mat.unit_cost : 0
                  const subtotal = Math.round((item.amount || 0) * unitCost)

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 90px 90px 32px',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'var(--bg-elevated)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {/* Dropdown Bahan */}
                      <select
                        className="form-select"
                        style={{ fontSize: '0.85rem', padding: '6px' }}
                        value={item.materialName}
                        onChange={(e) => {
                          const newName = e.target.value
                          setCustomRecipe(prev => {
                            const next = [...prev]
                            next[idx] = { ...next[idx], materialName: newName }
                            return next
                          })
                        }}
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.name}>{m.name} ({formatUnitCost(m.unit_cost, m.unit)})</option>
                        ))}
                      </select>

                      {/* Input Takaran */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          step="any"
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '6px', textAlign: 'right' }}
                          value={item.amount}
                          onChange={(e) => updateRecipeItemAmount(idx, e.target.value)}
                        />
                        <span className="text-xs text-muted" style={{ minWidth: '22px' }}>{unit}</span>
                      </div>

                      {/* Subtotal Biaya */}
                      <div style={{ textAlign: 'right' }}>
                        <span className="text-mono text-xs font-semibold" style={{ color: 'var(--teoffe-primary)' }}>
                          {formatRupiah(subtotal)}
                        </span>
                      </div>

                      {/* Hapus Baris */}
                      <button
                        className="btn btn-xs btn-danger"
                        style={{ padding: '4px', height: '28px', width: '28px', borderRadius: '4px' }}
                        onClick={() => removeRecipeItem(idx)}
                        title="Hapus bahan dari resep"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sisi Kanan: Ringkasan Biaya HPP & Keuntungan */}
            <div className="stat-card" style={{ padding: '20px', cursor: 'default', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📊 Analisis HPP & Margin Profit</h3>

                {/* Input Harga Jual */}
                <div className="form-group mb-md">
                  <label className="form-label">Rencana Harga Jual ke Konsumen (Rp):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={calculatorSellingPrice}
                    onChange={(e) => setCalculatorSellingPrice(parseFloat(e.target.value) || 0)}
                    style={{ fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>

                {/* Breakdown List */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-sm text-muted">Total Modal Bahan (HPP per Cup):</span>
                    <span className="text-mono font-bold" style={{ color: 'var(--status-error)', fontSize: '1rem' }}>
                      {formatRupiah(recipeCalculation.totalHPP)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-sm text-muted">Harga Jual per Cup:</span>
                    <span className="text-mono font-bold" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                      {formatRupiah(recipeCalculation.sellingPrice)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                    <span className="text-sm font-semibold">Gross Profit (Laba Kotor):</span>
                    <span className="text-mono font-bold" style={{ color: 'var(--status-success)', fontSize: '1.15rem' }}>
                      {formatRupiah(recipeCalculation.profit)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-sm font-semibold">Margin Keuntungan:</span>
                    <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                      {recipeCalculation.marginPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Porsi Bahan Baku */}
              <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                <div className="text-xs text-muted mb-xs font-semibold">💡 Catatan Perhitungan:</div>
                <div className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
                  Setiap kali Anda memperbarui harga beli atau ukuran kemasan bahan baku di menu <b>Inventaris</b>, angka HPP di atas akan otomatis disesuaikan secara real-time.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB RIWAYAT MUTASI */}
      {activeTab === 'logs' && (
        <div className="animate-fadeIn">
          <div className="table-container">
            {logs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Nama Bahan</th>
                    <th>Tipe Mutasi</th>
                    <th>Jumlah</th>
                    <th>Stok Sebelum</th>
                    <th>Stok Sesudah</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-sm text-muted">{formatDate(log.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{log.material_name || log.raw_materials?.name || '-'}</td>
                      <td>
                        <span className={`badge ${log.change_type === 'in' ? 'badge-success' : 'badge-warning'}`}>
                          {log.change_type === 'in' ? '➕ Restock' : '➖ Pemakaian'}
                        </span>
                      </td>
                      <td className="text-mono" style={{ fontWeight: 600 }}>
                        {formatNumber(log.quantity)} {log.unit || log.raw_materials?.unit || ''}
                      </td>
                      <td className="text-mono text-muted text-sm">{formatNumber(log.stock_before)}</td>
                      <td className="text-mono font-bold" style={{ color: 'var(--teoffe-primary)' }}>
                        {formatNumber(log.stock_after)}
                      </td>
                      <td className="text-sm text-muted">{log.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <p className="empty-state-title">Belum ada riwayat mutasi stok</p>
                <p className="empty-state-text">
                  Gunakan tombol "Atur Stok" pada salah satu bahan baku untuk mencatat pembelian baru atau pemakaian bahan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT BAHAN BAKU */}
      <Modal
        isOpen={materialModal.open}
        onClose={() => setMaterialModal({ open: false, isEdit: false, data: null })}
        title={materialModal.isEdit ? `Edit Bahan Baku — ${materialModal.data?.name}` : 'Tambah Bahan Baku Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmitMaterial}>
          <div className="form-group mb-sm">
            <label className="form-label">Nama Bahan Baku *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Contoh: Biji Kopi Hostblend / Aren Syrup"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row mb-sm">
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.filter(c => c !== 'Semua').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Satuan Ukuran</label>
              <select
                className="form-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="g">Gram (g)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="pcs">Pieces / Botol (pcs)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="L">Liter (L)</option>
              </select>
            </div>
          </div>

          <div className="form-row mb-sm">
            <div className="form-group">
              <label className="form-label">
                Berat / Isi Kemasan Beli ({formData.unit})
              </label>
              <input
                type="number"
                step="any"
                required
                className="form-input"
                placeholder="Misal: 1000 atau 19000"
                value={formData.package_size}
                onChange={(e) => setFormData({ ...formData, package_size: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Harga Modal Kemasan Beli (Rp) *</label>
              <input
                type="number"
                step="any"
                required
                className="form-input"
                placeholder="Misal: 177000"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              />
            </div>
          </div>

          {/* Real-time kalkulasi Harga per Berat/Satuan */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="text-xs text-muted block">Kalkulasi Otomatis Harga per {formData.unit}:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--teoffe-primary)' }}>
                  {formatUnitCost(
                    formData.is_custom_unit_cost && formData.unit_cost !== ''
                      ? parseFloat(formData.unit_cost)
                      : calculateAutoUnitCost(formData.cost_price, formData.package_size),
                    formData.unit
                  )}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => setFormData({
                  ...formData,
                  is_custom_unit_cost: !formData.is_custom_unit_cost,
                  unit_cost: formData.is_custom_unit_cost ? '' : calculateAutoUnitCost(formData.cost_price, formData.package_size),
                })}
              >
                {formData.is_custom_unit_cost ? 'Gunakan Auto Kalkulasi' : '✏️ Kustomisasi Manual'}
              </button>
            </div>

            {formData.is_custom_unit_cost && (
              <div style={{ marginTop: '8px' }}>
                <label className="form-label text-xs">Nilai Kustom Harga per {formData.unit} (Rp):</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="Masukkan angka kustom"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="form-row mb-sm">
            <div className="form-group">
              <label className="form-label">Stok Fisik Saat Ini ({formData.unit})</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Batas Minimum Peringatan ({formData.unit})</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="Batas warning restock"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group mb-lg">
            <label className="form-label">Catatan / Merek / Supplier (Opsional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Misal: Hostblend 70:30, Supplier Roastery X"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMaterialModal({ open: false, isEdit: false, data: null })}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : materialModal.isEdit ? 'Simpan Perubahan' : 'Tambah Bahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: UPDATE / RESTOCK STOK CEPAT */}
      <Modal
        isOpen={stockModal.open}
        onClose={() => setStockModal({ open: false, material: null, type: 'in', amount: '', notes: '', packageUnits: '' })}
        title={`Atur Stok — ${stockModal.material?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleQuickStockAdjust}>
          {stockModal.material && (
            <>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span className="text-xs text-muted">Stok Fisik Saat Ini:</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    {formatNumber(stockModal.material.current_stock)} {stockModal.material.unit}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-xs text-muted">Isi per Kemasan:</span>
                  <div className="text-sm font-semibold">
                    {formatNumber(stockModal.material.package_size)} {stockModal.material.unit}
                  </div>
                </div>
              </div>

              {/* Tipe Penyesuaian */}
              <div className="form-group mb-md">
                <label className="form-label">Pilih Aksi:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${stockModal.type === 'in' ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => setStockModal({ ...stockModal, type: 'in' })}
                  >
                    ➕ Restock (Masuk)
                  </button>
                  <button
                    type="button"
                    className={`btn ${stockModal.type === 'out' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setStockModal({ ...stockModal, type: 'out' })}
                  >
                    ➖ Pakai / Buang (Keluar)
                  </button>
                </div>
              </div>

              {/* Opsi Restock Berdasarkan Kemasan */}
              <div className="form-group mb-sm">
                <label className="form-label">
                  Input Berdasarkan Kemasan ({stockModal.material.package_size} {stockModal.material.unit}/kemasan):
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="Misal: 2 botol / 1 dus (otomatis dikali kemasan)"
                  value={stockModal.packageUnits}
                  onChange={(e) => {
                    const pkgs = e.target.value
                    const calculated = pkgs ? parseFloat(pkgs) * stockModal.material.package_size : ''
                    setStockModal({ ...stockModal, packageUnits: pkgs, amount: calculated })
                  }}
                />
              </div>

              {/* Atau Langsung Nominal Unit */}
              <div className="form-group mb-sm">
                <label className="form-label">
                  Atau Input Langsung ({stockModal.material.unit}):
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder={`Contoh: 500 ${stockModal.material.unit}`}
                  value={stockModal.amount}
                  onChange={(e) => setStockModal({ ...stockModal, amount: e.target.value, packageUnits: '' })}
                />
              </div>

              {/* Preview Hasil Akhir */}
              {stockModal.amount > 0 && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '6px', marginBottom: '12px' }}>
                  <span className="text-xs text-muted">Perkiraan Stok Baru: </span>
                  <span className="text-mono font-bold" style={{ color: stockModal.type === 'in' ? 'var(--status-success)' : 'var(--status-warning)' }}>
                    {formatNumber(
                      stockModal.type === 'in'
                        ? (stockModal.material.current_stock || 0) + parseFloat(stockModal.amount)
                        : Math.max(0, (stockModal.material.current_stock || 0) - parseFloat(stockModal.amount))
                    )}{' '}
                    {stockModal.material.unit}
                  </span>
                </div>
              )}

              <div className="form-group mb-lg">
                <label className="form-label">Catatan / Keterangan</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Misal: Beli di Roastery A / Tumpah saat bar"
                  value={stockModal.notes}
                  onChange={(e) => setStockModal({ ...stockModal, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStockModal({ open: false, material: null, type: 'in', amount: '', notes: '', packageUnits: '' })}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Memproses...' : 'Simpan Perubahan Stok'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* MODAL: KONFIRMASI HAPUS */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, material: null })}
        title="Konfirmasi Hapus Bahan Baku"
        size="sm"
      >
        <p className="text-sm mb-md">
          Apakah Anda yakin ingin menghapus bahan baku <b>{deleteModal.material?.name}</b>?
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setDeleteModal({ open: false, material: null })}
          >
            Batal
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDeleteMaterial}
          >
            Hapus
          </button>
        </div>
      </Modal>
    </div>
  )
}

