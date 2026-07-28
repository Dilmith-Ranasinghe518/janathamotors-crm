import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptyForm = { name: '', phone: '', email: '', address: '', vehicle_no: '', opening_balance: '0' }

export function CustomersPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const customersQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search: search || undefined } }).then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? api.put(`/customers/${editing.id}`, payload) : api.post('/customers', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setFormOpen(false)
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the customer.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setFormOpen(true)
  }

  function openEdit(customer) {
    setEditing(customer)
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      vehicle_no: customer.vehicle_no ?? '',
      opening_balance: customer.opening_balance,
    })
    setError('')
    setFormOpen(true)
  }

  const customers = customersQuery.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Profiles, vehicles, and running dues."
        actions={can('manage_customers') && <Button onClick={openCreate}>+ New customer</Button>}
      />

      <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-xs" />

      <Card className="overflow-x-auto">
        {customersQuery.isLoading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading…</p>
        ) : customers.length === 0 ? (
          <EmptyState message="No customers found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3 text-right">Current due</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/customers/${c.id}`} className="font-medium text-[var(--accent-2)] hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.phone || '—'}</td>
                  <td className="px-4 py-3">{c.vehicle_no || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(c.current_due) > 0 ? (
                      <span className="text-[var(--critical)] font-semibold">{Number(c.current_due).toFixed(2)}</span>
                    ) : (
                      '0.00'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {can('manage_customers') && (
                      <>
                        <button onClick={() => openEdit(c)} className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline">Edit</button>
                        <button
                          onClick={() => window.confirm(`Delete ${c.name}?`) && deleteMutation.mutate(c.id)}
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

      {formOpen && (
        <Modal title={editing ? 'Edit customer' : 'New customer'} onClose={() => setFormOpen(false)} wide>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              saveMutation.mutate(form)
            }}
            className="grid grid-cols-2 gap-4"
          >
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Vehicle no." value={form.vehicle_no} onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })} />
            <Input label="Address" className="col-span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            {!editing && (
              <Input
                label="Opening balance"
                type="number"
                step="0.01"
                value={form.opening_balance}
                onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
              />
            )}
            {error && <p className="col-span-2 text-sm text-[var(--critical)]">{error}</p>}
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save customer'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
