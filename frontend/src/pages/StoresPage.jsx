import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Store, Plus, Search, MapPin, Phone, Mail, Edit, Trash2, CheckCircle2, XCircle, Tag, FileText } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptyStore = {
  name: '',
  code: '',
  location: '',
  address: '',
  phone: '',
  email: '',
  is_active: true,
  notes: '',
}

export function StoresPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState(null)
  const [formData, setFormData] = useState(emptyStore)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [error, setError] = useState('')

  const storesQuery = useQuery({
    queryKey: ['stores', search, statusFilter],
    queryFn: () =>
      api
        .get('/stores', {
          params: {
            search: search || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
          },
        })
        .then((r) => r.data),
  })

  const stores = storesQuery.data?.data ?? []

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingStore) {
        return api.put(`/stores/${editingStore.id}`, payload)
      }
      return api.post('/stores', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      closeModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save store details.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/stores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      setDeleteConfirmId(null)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not delete store.')),
  })

  function openCreateModal() {
    setEditingStore(null)
    setFormData(emptyStore)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(store) {
    setEditingStore(store)
    setFormData({
      name: store.name || '',
      code: store.code || '',
      location: store.location || '',
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      is_active: store.is_active ?? true,
      notes: store.notes || '',
    })
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingStore(null)
    setFormData(emptyStore)
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Store Name is required.')
      return
    }
    if (!formData.code.trim()) {
      setError('Short Code is required.')
      return
    }
    if (!formData.location.trim()) {
      setError('Location is required.')
      return
    }

    saveMutation.mutate(formData)
  }

  const activeCount = stores.filter((s) => s.is_active).length
  const inactiveCount = stores.filter((s) => !s.is_active).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stores & Outlets"
        description="Manage company store locations, short codes, contact details, and operational statuses."
        actions={
          can('manage_stores') && (
            <Button onClick={openCreateModal} className="flex items-center gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Add New Store</span>
            </Button>
          )
        }
      />

      {/* Filter and Stats Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search by name, short code, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent)] transition"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-3 py-1 text-[var(--success)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {activeCount} Active
          </span>
          {inactiveCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--line)] px-3 py-1 text-[var(--muted)]">
              <XCircle className="h-3.5 w-3.5" />
              {inactiveCount} Inactive
            </span>
          )}
        </div>
      </div>

      {/* Stores List Grid / Table */}
      {storesQuery.isLoading ? (
        <Card className="p-8 text-center text-sm text-[var(--muted)]">Loading stores...</Card>
      ) : stores.length === 0 ? (
        <Card>
          <EmptyState message="No stores found matching your criteria." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="flex flex-col justify-between p-5 hover:border-[var(--accent)] transition shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--ink)] leading-snug">{store.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                        <span>{store.location}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      store.is_active
                        ? 'bg-[var(--success-soft)] text-[var(--success)]'
                        : 'bg-[var(--line)] text-[var(--muted)]'
                    }`}
                  >
                    {store.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-[var(--muted)] border-t border-[var(--line)] pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
                      <Tag className="h-3.5 w-3.5 text-[var(--accent)]" /> Short Code:
                    </span>
                    <span className="font-mono font-bold bg-[var(--paper)] border border-[var(--line)] px-2 py-0.5 rounded text-[var(--ink)]">
                      {store.code}
                    </span>
                  </div>

                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                      <span>{store.phone}</span>
                    </div>
                  )}

                  {store.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                      <span className="truncate">{store.email}</span>
                    </div>
                  )}

                  {store.address && (
                    <div className="flex items-start gap-2 pt-1 border-t border-[var(--line)] border-dashed">
                      <span className="text-[11px] leading-relaxed line-clamp-2">{store.address}</span>
                    </div>
                  )}

                  {store.notes && (
                    <div className="flex items-center gap-1.5 italic text-[11px] text-[var(--muted)] mt-1">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{store.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {can('manage_stores') && (
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--line)]">
                  <Button
                    variant="secondary"
                    className="px-3 py-1 text-xs flex items-center gap-1"
                    onClick={() => openEditModal(store)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-1 text-xs flex items-center gap-1"
                    onClick={() => setDeleteConfirmId(store.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Store Modal */}
      {modalOpen && (
        <Modal
          title={editingStore ? 'Edit Store Details' : 'Add New Store'}
          onClose={closeModal}
          wide
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-[var(--critical-soft)] p-3 text-xs text-[var(--critical)] font-semibold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Store Name *"
                placeholder="e.g. Janatha Motors Kandy Branch"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Short Code *"
                placeholder="e.g. KND-01"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />

              <Input
                label="Location / Area *"
                placeholder="e.g. Kandy Town"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />

              <Select
                label="Status"
                value={formData.is_active ? '1' : '0'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>

              <Input
                label="Phone Number"
                placeholder="e.g. +94 81 223 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. branch@janathamotors.lk"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Full Address</span>
              <textarea
                rows={2}
                placeholder="No. 45, Peradeniya Road, Kandy..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Notes / Remarks</span>
              <textarea
                rows={2}
                placeholder="Optional operational details or remarks..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] text-sm"
              />
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal title="Confirm Delete Store" onClose={() => setDeleteConfirmId(null)}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Are you sure you want to delete this store? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Store'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
