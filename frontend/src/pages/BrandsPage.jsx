import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function BrandsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('part-brands') // 'part-brands' | 'vehicle-brands' | 'vehicle-models'
  
  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [name, setName] = useState('')
  const [vehicleBrandId, setVehicleBrandId] = useState('')
  const [error, setError] = useState('')

  // Queries
  const partBrandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands').then((r) => r.data),
  })

  const vehicleBrandsQuery = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: () => api.get('/vehicle-brands').then((r) => r.data),
  })

  const vehicleModelsQuery = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: () => api.get('/vehicle-models').then((r) => r.data),
  })

  // Part Brand Mutations
  const savePartBrand = useMutation({
    mutationFn: (payload) =>
      editingItem ? api.put(`/brands/${editingItem.id}`, payload) : api.post('/brands', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      closeModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save part brand.')),
  })

  const deletePartBrand = useMutation({
    mutationFn: (id) => api.delete(`/brands/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  })

  // Vehicle Brand Mutations
  const saveVehicleBrand = useMutation({
    mutationFn: (payload) =>
      editingItem ? api.put(`/vehicle-brands/${editingItem.id}`, payload) : api.post('/vehicle-brands', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-brands'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      closeModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save vehicle brand.')),
  })

  const deleteVehicleBrand = useMutation({
    mutationFn: (id) => api.delete(`/vehicle-brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-brands'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
    },
  })

  // Vehicle Model Mutations
  const saveVehicleModel = useMutation({
    mutationFn: (payload) =>
      editingItem ? api.put(`/vehicle-models/${editingItem.id}`, payload) : api.post('/vehicle-models', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-brands'] })
      closeModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save vehicle model.')),
  })

  const deleteVehicleModel = useMutation({
    mutationFn: (id) => api.delete(`/vehicle-models/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-models'] }),
  })

  function openCreate() {
    setEditingItem(null)
    setName('')
    setVehicleBrandId(vehicleBrandsQuery.data?.[0]?.id ? String(vehicleBrandsQuery.data[0].id) : '')
    setError('')
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setName(item.name)
    if (activeTab === 'vehicle-models') {
      setVehicleBrandId(item.vehicle_brand_id ? String(item.vehicle_brand_id) : '')
    }
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
    setName('')
    setVehicleBrandId('')
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (activeTab === 'part-brands') {
      savePartBrand.mutate({ name })
    } else if (activeTab === 'vehicle-brands') {
      saveVehicleBrand.mutate({ name })
    } else if (activeTab === 'vehicle-models') {
      if (!vehicleBrandId) {
        setError('Please select a vehicle brand.')
        return
      }
      saveVehicleModel.mutate({ name, vehicle_brand_id: Number(vehicleBrandId) })
    }
  }

  const partBrands = partBrandsQuery.data ?? []
  const vehicleBrands = vehicleBrandsQuery.data ?? []
  const vehicleModels = vehicleModelsQuery.data ?? []

  const isPending = savePartBrand.isPending || saveVehicleBrand.isPending || saveVehicleModel.isPending

  return (
    <div>
      <PageHeader
        title="Brands & Vehicles"
        description="Manage spare part brands, vehicle makes, and vehicle models."
        actions={can('manage_products') && <Button onClick={openCreate}>+ Add {activeTab === 'part-brands' ? 'Part Brand' : activeTab === 'vehicle-brands' ? 'Vehicle Brand' : 'Vehicle Model'}</Button>}
      />

      {/* Tabs Header */}
      <div className="mb-6 flex border-b border-[var(--line)]">
        <button
          onClick={() => setActiveTab('part-brands')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'part-brands'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Part Brands ({partBrands.length})
        </button>
        <button
          onClick={() => setActiveTab('vehicle-brands')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'vehicle-brands'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Vehicle Brands ({vehicleBrands.length})
        </button>
        <button
          onClick={() => setActiveTab('vehicle-models')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'vehicle-models'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          Vehicle Models ({vehicleModels.length})
        </button>
      </div>

      {/* TAB 1: PART BRANDS */}
      {activeTab === 'part-brands' && (
        <Card className="overflow-x-auto">
          {partBrandsQuery.isLoading ? (
            <p className="p-6 text-sm text-[var(--muted)]">Loading part brands…</p>
          ) : partBrands.length === 0 ? (
            <EmptyState message="No part brands added yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3">Brand Name</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partBrands.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {can('manage_products') && (
                        <>
                          <button
                            onClick={() => openEdit(b)}
                            className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              window.confirm(`Delete part brand "${b.name}"?`) && deletePartBrand.mutate(b.id)
                            }
                            className="text-xs font-semibold text-[var(--critical)] hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* TAB 2: VEHICLE BRANDS */}
      {activeTab === 'vehicle-brands' && (
        <Card className="overflow-x-auto">
          {vehicleBrandsQuery.isLoading ? (
            <p className="p-6 text-sm text-[var(--muted)]">Loading vehicle brands…</p>
          ) : vehicleBrands.length === 0 ? (
            <EmptyState message="No vehicle brands added yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3">Vehicle Brand / Make</th>
                  <th className="px-4 py-3">Total Models</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicleBrands.map((vb) => (
                  <tr key={vb.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-medium">{vb.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{vb.vehicle_models_count ?? 0} models</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {can('manage_products') && (
                        <>
                          <button
                            onClick={() => openEdit(vb)}
                            className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              window.confirm(`Delete vehicle brand "${vb.name}" and all associated models?`) &&
                              deleteVehicleBrand.mutate(vb.id)
                            }
                            className="text-xs font-semibold text-[var(--critical)] hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* TAB 3: VEHICLE MODELS */}
      {activeTab === 'vehicle-models' && (
        <Card className="overflow-x-auto">
          {vehicleModelsQuery.isLoading ? (
            <p className="p-6 text-sm text-[var(--muted)]">Loading vehicle models…</p>
          ) : vehicleModels.length === 0 ? (
            <EmptyState message="No vehicle models added yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3">Vehicle Model</th>
                  <th className="px-4 py-3">Vehicle Brand</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicleModels.map((vm) => (
                  <tr key={vm.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-medium">{vm.name}</td>
                    <td className="px-4 py-3 text-sm">{vm.vehicle_brand?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {can('manage_products') && (
                        <>
                          <button
                            onClick={() => openEdit(vm)}
                            className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              window.confirm(`Delete vehicle model "${vm.name}"?`) && deleteVehicleModel.mutate(vm.id)
                            }
                            className="text-xs font-semibold text-[var(--critical)] hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <Modal
          title={
            editingItem
              ? `Edit ${activeTab === 'part-brands' ? 'Part Brand' : activeTab === 'vehicle-brands' ? 'Vehicle Brand' : 'Vehicle Model'}`
              : `New ${activeTab === 'part-brands' ? 'Part Brand' : activeTab === 'vehicle-brands' ? 'Vehicle Brand' : 'Vehicle Model'}`
          }
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {activeTab === 'vehicle-models' && (
              <Select
                label="Vehicle Brand"
                required
                value={vehicleBrandId}
                onChange={(e) => setVehicleBrandId(e.target.value)}
              >
                <option value="">Select vehicle brand…</option>
                {vehicleBrands.map((vb) => (
                  <option key={vb.id} value={vb.id}>
                    {vb.name}
                  </option>
                ))}
              </Select>
            )}

            <Input
              label={
                activeTab === 'part-brands'
                  ? 'Part Brand Name (e.g. Denso, Bosch, NGK)'
                  : activeTab === 'vehicle-brands'
                  ? 'Vehicle Brand / Make (e.g. Toyota, Nissan, Honda)'
                  : 'Vehicle Model Name (e.g. Corolla, Hilux, Axio)'
              }
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {error && <p className="text-sm text-[var(--critical)]">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
