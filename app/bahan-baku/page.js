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
  const [recipeDrinkName, setRecipeDrinkName] = useState(DRINK_PRESETS[0].name)
  const [customRecipe, setCustomRecipe] = useState(DRINK_PRESETS[0].recipe)
  const [calculatorSellingPrice, setCalculatorSellingPrice] = useState(DRINK_PRESETS[0].sellingPrice)
  const [calculatorCategoryFilter, setCalculatorCategoryFilter] = useState('Semua')
  const [savedRecipes, setSavedRecipes] = useState([])
  const [addIngredientModal, setAddIngredientModal] = useState({ open: false, materialId: '', amount: '' })
  const [inlineMaterialId, setInlineMaterialId] = useState('')
  const [inlineAmount, setInlineAmount] = useState('')

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

  // Load saved custom recipes on mount
  useEffect(() => {
    try {
      const local = localStorage.getItem('teoffe_custom_recipes')
      if (local) setSavedRecipes(JSON.parse(local))
    } catch {}
  }, [])

  // Kalkulator HPP Preset change
  function handlePresetChange(presetName) {
    setSelectedPreset(presetName)
    if (presetName === 'custom') {
      setRecipeDrinkName('Racikan Kustom Baru')
      return
    }
    // Check in built-in presets
    const preset = DRINK_PRESETS.find(p => p.name === presetName)
    if (preset) {
      setRecipeDrinkName(preset.name)
      setCustomRecipe(preset.recipe.map(r => ({ ...r })))
      setCalculatorSellingPrice(preset.sellingPrice)
      return
    }
    // Check in saved custom recipes
    const saved = savedRecipes.find(r => r.name === presetName)
    if (saved) {
      setRecipeDrinkName(saved.name)
      setCustomRecipe(saved.recipe.map(r => ({ ...r })))
      setCalculatorSellingPrice(saved.sellingPrice)
    }
  }

  // Buka modal untuk memilih dan mengatur takaran bahan
  function openAddModalForMaterial(material) {
    const target = material || (materials.length > 0 ? materials[0] : null)
    setAddIngredientModal({
      open: true,
      materialId: target ? target.id : '',
      amount: target ? (target.unit === 'pcs' ? 1 : target.unit === 'ml' ? 50 : 15) : '',
    })
  }

  // Konfirmasi penambahan bahan pilihan user ke dalam racikan
  function handleConfirmAddMaterial(materialId, amount) {
    if (!materialId) {
      showToast('Pilih bahan baku terlebih dahulu!', 'error')
      return false
    }
    const portion = parseFloat(amount)
    if (!portion || portion <= 0) {
      showToast('Masukkan takaran porsi lebih dari 0!', 'error')
      return false
    }
    const mat = materials.find(m => m.id === materialId)
    if (!mat) {
      showToast('Bahan baku tidak ditemukan!', 'error')
      return false
    }

    const existingIndex = customRecipe.findIndex(
      r => (r.materialId && r.materialId === mat.id) || (r.materialName && r.materialName.toLowerCase() === mat.name.toLowerCase())
    )

    if (existingIndex !== -1) {
      setCustomRecipe(prev => {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          amount: (parseFloat(next[existingIndex].amount) || 0) + portion,
        }
        return next
      })
      showToast(`Takaran ${mat.name} ditambah ${portion} ${mat.unit}!`, 'success')
    } else {
      setCustomRecipe(prev => [
        ...prev,
        {
          materialId: mat.id,
          materialName: mat.name,
          amount: portion,
        }
      ])
      showToast(`${mat.name} (${portion} ${mat.unit}) berhasil dimasukkan ke racikan!`, 'success')
    }
    return true
  }

  // Update takaran bahan di kalkulator
  function updateRecipeItemAmount(index, amount) {
    setCustomRecipe(prev => {
      const next = [...prev]
      next[index] = { ...next[index], amount: Math.max(0, parseFloat(amount) || 0) }
      return next
    })
  }

  // Penyesuaian takaran cepat (stepper +/-)
  function adjustRecipeItemAmount(index, delta) {
    setCustomRecipe(prev => {
      const next = [...prev]
      const current = parseFloat(next[index].amount) || 0
      const updated = Math.max(0, Math.round((current + delta) * 10) / 10)
      next[index] = { ...next[index], amount: updated }
      return next
    })
  }

  // Ganti bahan dalam baris
  function changeRecipeItemMaterial(index, newMaterialName) {
    const targetMat = materials.find(m => m.name === newMaterialName)
    setCustomRecipe(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        materialId: targetMat ? targetMat.id : undefined,
        materialName: newMaterialName,
      }
      return next
    })
  }

  // Buka dialog tambah bahan
  function addRecipeItem() {
    openAddModalForMaterial(null)
  }

  // Hapus baris bahan di kalkulator
  function removeRecipeItem(index) {
    setCustomRecipe(prev => prev.filter((_, i) => i !== index))
  }

  // Kosongkan seluruh racikan untuk mulai dari kanvas bersih
  function clearRecipe() {
    setCustomRecipe([])
    setSelectedPreset('custom')
    setRecipeDrinkName('Racikan Kustom Baru')
    showToast('Racikan dikosongkan. Silakan pilih bahan-bahan Anda.', 'info')
  }

  // Reset racikan ke preset terpilih
  function resetToPreset(presetName) {
    const target = presetName || DRINK_PRESETS[0].name
    setSelectedPreset(target)
    const preset = DRINK_PRESETS.find(p => p.name === target)
    if (preset) {
      setRecipeDrinkName(preset.name)
      setCustomRecipe(preset.recipe.map(r => ({ ...r })))
      setCalculatorSellingPrice(preset.sellingPrice)
      showToast(`Resep "${preset.name}" dimuat kembali`, 'success')
    }
  }

  // Simpan racikan saat ini ke savedRecipes
  function handleSaveCurrentRecipe() {
    if (!recipeDrinkName.trim()) {
      showToast('Beri nama racikan terlebih dahulu!', 'error')
      return
    }
    if (customRecipe.length === 0) {
      showToast('Racikan belum memiliki bahan baku!', 'error')
      return
    }
    const newEntry = {
      name: recipeDrinkName.trim(),
      sellingPrice: calculatorSellingPrice,
      recipe: customRecipe,
      savedAt: new Date().toISOString(),
    }
    const updatedList = [
      ...savedRecipes.filter(r => r.name.toLowerCase() !== recipeDrinkName.trim().toLowerCase()),
      newEntry,
    ]
    setSavedRecipes(updatedList)
    localStorage.setItem('teoffe_custom_recipes', JSON.stringify(updatedList))
    setSelectedPreset(newEntry.name)
    showToast(`Racikan "${newEntry.name}" berhasil disimpan!`, 'success')
  }

  // Salin rincian kalkulasi ke clipboard
  function handleCopyRecipeSummary() {
    if (customRecipe.length === 0) return
    let text = `=== TEOFFE HPP KALKULATOR ===\n`
    text += `Menu: ${recipeDrinkName}\n`
    text += `Rencana Harga Jual: ${formatRupiah(recipeCalculation.sellingPrice)}\n`
    text += `Total Modal HPP: ${formatRupiah(recipeCalculation.totalHPP)}\n`
    text += `Gross Profit: ${formatRupiah(recipeCalculation.profit)} (${recipeCalculation.marginPercent}%)\n\n`
    text += `KOMPOSISI BAHAN:\n`
    recipeCalculation.details.forEach(d => {
      text += `- ${d.name}: ${d.amount} ${d.unit} (${formatRupiah(d.subtotal)} | ${d.sharePercent}%)\n`
    })
    navigator.clipboard.writeText(text)
    showToast('Rincian HPP berhasil disalin ke clipboard!', 'success')
  }

  // Total HPP Resep Terkalkulasi
  const recipeCalculation = useMemo(() => {
    let totalHPP = 0
    const details = customRecipe.map(item => {
      const mat = materials.find(m =>
        (item.materialId && m.id === item.materialId) ||
        m.name.toLowerCase() === (item.materialName || '').toLowerCase()
      )
      const unitCost = mat ? mat.unit_cost : 0
      const subtotal = (item.amount || 0) * unitCost
      totalHPP += subtotal
      return {
        ...item,
        material: mat,
        name: mat ? mat.name : item.materialName,
        category: mat ? mat.category : 'Lainnya',
        icon: mat ? (mat.icon || '☕') : '☕',
        unit: mat ? mat.unit : 'g',
        unitCost,
        subtotal: Math.round(subtotal),
        availableStock: mat ? mat.current_stock : 0,
      }
    })

    const sellingPrice = parseFloat(calculatorSellingPrice) || 0
    const profit = sellingPrice - totalHPP
    const marginPercent = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : 0

    const detailsWithShare = details.map(d => ({
      ...d,
      sharePercent: totalHPP > 0 ? Math.round((d.subtotal / totalHPP) * 100) : 0,
    }))

    return {
      totalHPP: Math.round(totalHPP),
      details: detailsWithShare,
      sellingPrice,
      profit: Math.round(profit),
      marginPercent: parseFloat(marginPercent) || 0,
    }
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
                              padding: '4px 8px', borderRadius: 'var(--radius-xs)',
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
          {/* Header Kontrol Resep */}
          <div
            className="stat-card mb-lg"
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              <div>
                <label className="form-label" style={{ marginBottom: '4px', fontSize: '0.72rem' }}>
                  PILIH RESEP MENU:
                </label>
                <select
                  className="form-select"
                  style={{ minWidth: '240px', padding: '6px 12px', fontSize: '0.86rem' }}
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                >
                  <optgroup label="☕ Menu Preset TEOFFE">
                    {DRINK_PRESETS.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </optgroup>
                  {savedRecipes.length > 0 && (
                    <optgroup label="⭐ Racikan Tersimpan Saya">
                      {savedRecipes.map(r => (
                        <option key={r.name} value={r.name}>⭐ {r.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="✏️ Kustom">
                    <option value="custom">-- Buat Racikan Baru Sendiri --</option>
                  </optgroup>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label" style={{ marginBottom: '4px', fontSize: '0.72rem' }}>
                  NAMA MINUMAN / RACIKAN:
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 12px', fontSize: '0.86rem', fontWeight: 600 }}
                  value={recipeDrinkName}
                  onChange={(e) => {
                    setRecipeDrinkName(e.target.value)
                    setSelectedPreset('custom')
                  }}
                  placeholder="Ketik nama minuman racikan Anda..."
                />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => openAddModalForMaterial(null)}
                title="Pilih bahan dan takaran yang ingin ditambahkan"
              >
                ➕ Tambah Bahan
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={clearRecipe}
                title="Bersihkan semua bahan untuk mulai dari awal"
              >
                🧹 Kosongkan Resep
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => resetToPreset(selectedPreset !== 'custom' ? selectedPreset : DRINK_PRESETS[0].name)}
                title="Kembalikan ke resep bawaan"
              >
                🔄 Reset
              </button>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={handleSaveCurrentRecipe}
                title="Simpan racikan ini agar bisa dipakai kembali"
              >
                💾 Simpan Racikan
              </button>
            </div>
          </div>

          {/* Katalog Bahan Baku (Pilih Sendiri Bahan yang Ingin Ditambahkan) */}
          <div
            className="card mb-lg"
            style={{
              padding: '16px 20px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🥫</span> Pilih Bahan Sendiri dari Katalog:
                </h4>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  Klik bahan di bawah untuk menentukan takaran dan memasukkannya ke dalam racikan:
                </p>
              </div>

              {/* Filter Kategori */}
              <div className="filter-bar" style={{ display: 'flex', gap: '4px' }}>
                {['Semua', 'Kopi & Espresso', 'Dairy & Krimer', 'Sirup & Pemanis', 'Kemasan & Packaging'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`filter-chip ${calculatorCategoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setCalculatorCategoryFilter(cat)}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Chips - Klik membuka modal dengan bahan terpilih untuk konfirmasi takaran */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {materials
                .filter(m => calculatorCategoryFilter === 'Semua' || m.category === calculatorCategoryFilter)
                .map(mat => {
                  const isSelected = customRecipe.some(
                    r => (r.materialId && r.materialId === mat.id) || (r.materialName && r.materialName.toLowerCase() === mat.name.toLowerCase())
                  )

                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => openAddModalForMaterial(mat)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(91, 164, 201, 0.15)' : 'var(--bg-elevated)',
                        border: isSelected ? '1px solid var(--teoffe-primary)' : '1px solid var(--border-color)',
                        color: isSelected ? 'var(--teoffe-primary)' : 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                      title={`Klik untuk memilih dan mengatur takaran ${mat.name}`}
                    >
                      <span>{mat.icon || '☕'}</span>
                      <span>{mat.name}</span>
                      <span className="text-mono text-xs" style={{ opacity: 0.8, color: 'var(--text-secondary)' }}>
                        ({formatUnitCost(mat.unit_cost, mat.unit)})
                      </span>
                      {isSelected ? (
                        <span style={{ fontSize: '0.75rem', marginLeft: '2px', color: 'var(--status-success)' }}>✓ Di Resep</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', marginLeft: '2px', color: 'var(--teoffe-primary)' }}>+ Pilih</span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Grid Dua Kolom: Tabel Racikan (Kiri) & Analisis Margin (Kanan) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* SISI KIRI: TABEL RACIKAN RESEP */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚖️</span> Komposisi Racikan ({customRecipe.length} Bahan)
                  </h3>
                  <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                    Takaran porsi bahan saat ini untuk 1 cup minuman
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  onClick={() => openAddModalForMaterial(null)}
                >
                  ➕ Tambah Bahan
                </button>
              </div>

              {/* Form Inline Tambah Bahan Cepat (Pilih Sendiri di Bawah Tabel) */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}
              >
                <div className="text-xs font-semibold mb-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>➕</span> Tambah Bahan Sendiri ke Racikan:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                    value={inlineMaterialId}
                    onChange={(e) => {
                      const mId = e.target.value
                      const mat = materials.find(m => m.id === mId)
                      setInlineMaterialId(mId)
                      setInlineAmount(mat ? (mat.unit === 'pcs' ? '1' : mat.unit === 'ml' ? '50' : '15') : '')
                    }}
                  >
                    <option value="">-- Pilih Bahan Baku yang Ingin Ditambahkan --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.icon || '☕'} {m.name} ({formatUnitCost(m.unit_cost, m.unit)})
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Takaran"
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '6px 8px', textAlign: 'center' }}
                      value={inlineAmount}
                      onChange={(e) => setInlineAmount(e.target.value)}
                    />
                    <span className="text-xs text-muted" style={{ minWidth: '24px', fontWeight: 600 }}>
                      {materials.find(m => m.id === inlineMaterialId)?.unit || 'g/ml'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const success = handleConfirmAddMaterial(inlineMaterialId, inlineAmount)
                      if (success) {
                        setInlineMaterialId('')
                        setInlineAmount('')
                      }
                    }}
                    style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                  >
                    ➕ Masukkan
                  </button>
                </div>
              </div>

              {customRecipe.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recipeCalculation.details.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        {/* Selector / Nama Bahan */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                          <select
                            className="form-select"
                            style={{
                              fontSize: '0.86rem',
                              fontWeight: 600,
                              padding: '4px 8px',
                              background: 'transparent',
                              border: '1px solid transparent',
                              cursor: 'pointer',
                            }}
                            value={item.name}
                            onChange={(e) => changeRecipeItemMaterial(idx, e.target.value)}
                          >
                            {materials.map(m => (
                              <option key={m.id} value={m.name}>
                                {m.name} ({formatUnitCost(m.unit_cost, m.unit)})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Subtotal Biaya */}
                        <div style={{ textAlign: 'right' }}>
                          <span
                            className="text-mono"
                            style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--teoffe-primary)' }}
                          >
                            {formatRupiah(item.subtotal)}
                          </span>
                          <span className="text-xs text-muted" style={{ display: 'block', fontSize: '0.68rem' }}>
                            {item.sharePercent}% dari HPP
                          </span>
                        </div>

                        {/* Hapus Bahan */}
                        <button
                          type="button"
                          className="btn btn-xs btn-danger"
                          style={{ padding: '4px 8px', marginLeft: '4px' }}
                          onClick={() => removeRecipeItem(idx)}
                          title="Hapus bahan dari racikan"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Baris Takaran + Stepper */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          paddingTop: '6px',
                        }}
                      >
                        <span className="text-xs text-muted">
                          Harga Modal: <b style={{ color: 'var(--text-secondary)' }}>{formatUnitCost(item.unitCost, item.unit)}</b>
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="text-xs text-muted" style={{ marginRight: '4px' }}>Takaran:</span>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                            onClick={() => adjustRecipeItemAmount(idx, item.unit === 'pcs' ? -1 : -5)}
                            title="Kurangi takaran"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="form-input"
                            style={{
                              width: '70px',
                              padding: '3px 6px',
                              textAlign: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                            }}
                            value={item.amount}
                            onChange={(e) => updateRecipeItemAmount(idx, e.target.value)}
                          />
                          <span
                            className="text-xs text-muted"
                            style={{ minWidth: '24px', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            {item.unit}
                          </span>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                            onClick={() => adjustRecipeItemAmount(idx, item.unit === 'pcs' ? 1 : 5)}
                            title="Tambah takaran"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="empty-state"
                  style={{
                    padding: '40px 20px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>☕</div>
                  <p className="empty-state-title" style={{ fontSize: '0.95rem' }}>
                    Belum ada bahan di dalam racikan
                  </p>
                  <p className="empty-state-text text-xs text-muted" style={{ maxWidth: '320px', margin: '4px auto 16px' }}>
                    Pilih bahan dari dropdown di atas atau klik katalog bahan baku untuk memulai racikan Anda.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => openAddModalForMaterial(null)}
                  >
                    ➕ Pilih Bahan Baku Sekarang
                  </button>
                </div>
              )}
            </div>

            {/* SISI KANAN: ANALISIS HPP & MARGIN PROFIT */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span> Analisis HPP & Profit
                  </h3>
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    onClick={handleCopyRecipeSummary}
                    title="Salin ringkasan kalkulasi"
                  >
                    📋 Salin Rincian
                  </button>
                </div>

                {/* Input Rencana Harga Jual */}
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginBottom: '16px',
                  }}
                >
                  <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '6px' }}>
                    RENCANA HARGA JUAL KE KONSUMEN:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Rp</span>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      className="form-input"
                      style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--teoffe-primary)' }}
                      value={calculatorSellingPrice}
                      onChange={(e) => setCalculatorSellingPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* KPI Breakdown Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                    }}
                  >
                    <span className="text-xs text-muted" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Total Modal HPP
                    </span>
                    <span
                      className="text-mono"
                      style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-error)', display: 'block', marginTop: '2px' }}
                    >
                      {formatRupiah(recipeCalculation.totalHPP)}
                    </span>
                    <span className="text-xs text-muted" style={{ fontSize: '0.68rem' }}>
                      per 1 cup siap saji
                    </span>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                    }}
                  >
                    <span className="text-xs text-muted" style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      Gross Profit / Laba
                    </span>
                    <span
                      className="text-mono"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: recipeCalculation.profit > 0 ? 'var(--status-success)' : 'var(--status-error)',
                        display: 'block',
                        marginTop: '2px',
                      }}
                    >
                      {formatRupiah(recipeCalculation.profit)}
                    </span>
                    <span className="text-xs text-muted" style={{ fontSize: '0.68rem' }}>
                      keuntungan per cup
                    </span>
                  </div>
                </div>

                {/* Margin Profit Health Status */}
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="text-xs font-semibold">Margin Keuntungan Bersih:</span>
                    <span
                      className={`badge ${
                        recipeCalculation.marginPercent >= 60
                          ? 'badge-success'
                          : recipeCalculation.marginPercent >= 40
                          ? 'badge-warning'
                          : 'badge-error'
                      }`}
                      style={{ fontSize: '0.85rem', padding: '3px 10px' }}
                    >
                      {recipeCalculation.marginPercent}%
                    </span>
                  </div>

                  {/* Progress Bar Margin */}
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, recipeCalculation.marginPercent))}%`,
                        background:
                          recipeCalculation.marginPercent >= 60
                            ? 'var(--status-success)'
                            : recipeCalculation.marginPercent >= 40
                            ? 'var(--status-warning)'
                            : 'var(--status-error)',
                        transition: 'width var(--transition-base)',
                      }}
                    />
                  </div>

                  <p className="text-xs text-muted" style={{ marginTop: '8px', fontSize: '0.72rem', lineHeight: 1.4 }}>
                    {recipeCalculation.marginPercent >= 60 ? (
                      <span style={{ color: 'var(--status-success)' }}>
                        🟢 <b>Margin Sangat Sehat</b> (&gt; 60%): Racikan ini sangat menguntungkan dan ideal untuk scale-up operasional cafe.
                      </span>
                    ) : recipeCalculation.marginPercent >= 40 ? (
                      <span style={{ color: 'var(--status-warning)' }}>
                        🟡 <b>Margin Standar</b> (40% - 60%): Margin cukup aman untuk menutup biaya operasional dan pegawai.
                      </span>
                    ) : (
                      <span style={{ color: 'var(--status-error)' }}>
                        🔴 <b>Margin Terlalu Tipis</b> (&lt; 40%): Pertimbangkan untuk menaikkan harga jual atau menyesuaikan takaran bahan premium.
                      </span>
                    )}
                  </p>
                </div>

                {/* Simulasi Proyeksi Penjualan */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <span className="text-xs text-muted font-semibold" style={{ display: 'block', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    📈 Proyeksi Keuntungan Berdasarkan Volume:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[50, 100, 500].map(qty => (
                      <div
                        key={qty}
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '8px',
                          borderRadius: 'var(--radius-xs)',
                          textAlign: 'center',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span className="text-xs text-muted" style={{ display: 'block', fontSize: '0.68rem' }}>{qty} Cup</span>
                        <span className="text-mono font-bold text-xs" style={{ color: 'var(--status-success)' }}>
                          {formatRupiah(recipeCalculation.profit * qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="text-xs text-muted" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                  💡 <b>Real-time Sync:</b> Perubahan harga beli kemasan di menu <b>Inventaris</b> akan langsung mengupdate kalkulasi HPP ini tanpa perlu rumus manual.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB RIWAYAT MUTASI */}
      {activeTab === 'logs' && ({/* TAB RIWAYAT MUTASI */}
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

      {/* MODAL: PILIH & TAMBAH BAHAN KE RACIKAN RESEP */}
      <Modal
        isOpen={addIngredientModal.open}
        onClose={() => setAddIngredientModal({ open: false, materialId: '', amount: '' })}
        title="➕ Pilih Bahan & Tentukan Takaran"
        size="md"
      >
        {(() => {
          const selectedMat = materials.find(m => m.id === addIngredientModal.materialId) || materials[0]
          const unit = selectedMat ? selectedMat.unit : 'g'
          const unitCost = selectedMat ? selectedMat.unit_cost : 0
          const portionNum = parseFloat(addIngredientModal.amount) || 0
          const subtotalCost = Math.round(portionNum * unitCost)

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p className="text-xs text-muted">
                Pilih bahan baku yang ingin dimasukkan ke dalam racikan dan tentukan jumlah takarannya:
              </p>

              {/* 1. Pilih Bahan Baku */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  1. PILIH BAHAN BAKU:
                </label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.9rem', padding: '8px 12px' }}
                  value={addIngredientModal.materialId}
                  onChange={(e) => {
                    const mId = e.target.value
                    const mat = materials.find(m => m.id === mId)
                    setAddIngredientModal(prev => ({
                      ...prev,
                      materialId: mId,
                      amount: mat ? (mat.unit === 'pcs' ? '1' : mat.unit === 'ml' ? '50' : '15') : prev.amount,
                    }))
                  }}
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.icon || '☕'} {m.name} — {formatUnitCost(m.unit_cost, m.unit)} (Stok: {formatNumber(m.current_stock)} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Detail Bahan Terpilih */}
              {selectedMat && (
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{selectedMat.icon || '☕'}</span>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, display: 'block' }}>{selectedMat.name}</span>
                      <span className="text-xs text-muted">{selectedMat.category}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="text-xs text-muted" style={{ display: 'block', fontSize: '0.68rem' }}>Harga Modal</span>
                    <span className="text-mono font-bold" style={{ color: 'var(--teoffe-primary)', fontSize: '0.9rem' }}>
                      {formatUnitCost(selectedMat.unit_cost, selectedMat.unit)}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Tentukan Takaran Porsi */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  2. TAKARAN PORSI PER CUP:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Contoh: 18"
                    className="form-input"
                    style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', flex: 1 }}
                    value={addIngredientModal.amount}
                    onChange={(e) => setAddIngredientModal(prev => ({ ...prev, amount: e.target.value }))}
                    autoFocus
                  />
                  <span
                    className="badge badge-default"
                    style={{ fontSize: '0.9rem', padding: '8px 14px', minWidth: '50px', textAlign: 'center' }}
                  >
                    {unit}
                  </span>
                </div>

                {/* Quick Takaran Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span className="text-xs text-muted" style={{ alignSelf: 'center', marginRight: '4px' }}>Pilihan Cepat:</span>
                  {(unit === 'pcs'
                    ? [1, 2, 3]
                    : unit === 'ml'
                    ? [10, 15, 20, 25, 30, 50, 100, 120]
                    : [5, 10, 15, 18, 20, 25, 30]
                  ).map(val => (
                    <button
                      key={val}
                      type="button"
                      className="btn btn-xs btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      onClick={() => setAddIngredientModal(prev => ({ ...prev, amount: val.toString() }))}
                    >
                      {val} {unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kalkulasi Subtotal Live */}
              <div
                style={{
                  background: 'rgba(91, 164, 201, 0.08)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="text-xs text-muted">Subtotal Modal Bahan Ini:</span>
                <span className="text-mono font-bold" style={{ color: 'var(--teoffe-primary)', fontSize: '1.1rem' }}>
                  {formatRupiah(subtotalCost)}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setAddIngredientModal({ open: false, materialId: '', amount: '' })}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={!addIngredientModal.materialId || !parseFloat(addIngredientModal.amount)}
                  onClick={() => {
                    const success = handleConfirmAddMaterial(addIngredientModal.materialId, addIngredientModal.amount)
                    if (success) {
                      setAddIngredientModal({ open: false, materialId: '', amount: '' })
                    }
                  }}
                >
                  ➕ Masukkan Bahan ke Resep
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

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
              borderRadius: 'var(--radius-sm)',
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
                  borderRadius: 'var(--radius-sm)',
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
                <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
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

