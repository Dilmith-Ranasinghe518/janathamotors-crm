import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptyForm = { name: '', email: '', password: '', role: '', is_active: true }

export function UsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data) })
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/roles').then((r) => r.data) })

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? api.put(`/users/${editing.id}`, payload) : api.post('/users', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setFormOpen(false)
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the user.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => window.alert(apiErrorMessage(err, 'Could not delete user.')),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setFormOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.roles?.[0]?.name ?? '', is_active: u.is_active })
    setError('')
    setFormOpen(true)
  }

  const users = usersQuery.data ?? []
  const roles = rolesQuery.data ?? []

  return (
    <div>
      <PageHeader title="Users" description="Team accounts and their assigned role." actions={<Button onClick={openCreate}>+ New user</Button>} />

      <Card className="overflow-x-auto">
        {users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.roles?.[0]?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={u.is_active ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline">Edit</button>
                    {u.id !== me?.id && (
                      <button
                        onClick={() => window.confirm(`Delete ${u.name}?`) && deleteMutation.mutate(u.id)}
                        className="text-xs font-semibold text-[var(--critical)] hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {formOpen && (
        <Modal title={editing ? 'Edit user' : 'New user'} onClose={() => setFormOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              const payload = { ...form }
              if (editing && !payload.password) delete payload.password
              saveMutation.mutate(payload)
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input
              label={editing ? 'New password (leave blank to keep current)' : 'Password'}
              type="password"
              required={!editing}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Select label="Role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </Select>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
            )}
            {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Save</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
