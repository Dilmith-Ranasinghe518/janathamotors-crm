import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader } from '../components/ui'

export function RolesPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [error, setError] = useState('')

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: () => api.get('/roles').then((r) => r.data) })
  const permissionsQuery = useQuery({ queryKey: ['permissions'], queryFn: () => api.get('/permissions').then((r) => r.data) })

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? api.put(`/roles/${editing.id}`, payload) : api.post('/roles', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setFormOpen(false)
      setEditing(null)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the role.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
    onError: (err) => window.alert(apiErrorMessage(err, 'Could not delete role.')),
  })

  function openCreate() {
    setEditing(null)
    setName('')
    setSelectedPermissions([])
    setError('')
    setFormOpen(true)
  }

  function openEdit(role) {
    setEditing(role)
    setName(role.name)
    setSelectedPermissions(role.permissions.map((p) => p.name))
    setError('')
    setFormOpen(true)
  }

  function togglePermission(perm) {
    setSelectedPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]))
  }

  const roles = rolesQuery.data ?? []
  const permissions = permissionsQuery.data ?? []

  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Define what each role is allowed to do." actions={<Button onClick={openCreate}>+ New role</Button>} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.length === 0 ? (
          <EmptyState message="No roles yet." />
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-[var(--ink)]">{role.name}</p>
                <div>
                  <button onClick={() => openEdit(role)} className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline">Edit</button>
                  {role.name !== 'Admin' && (
                    <button
                      onClick={() => window.confirm(`Delete role ${role.name}?`) && deleteMutation.mutate(role.id)}
                      className="text-xs font-semibold text-[var(--critical)] hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.length ? (
                  role.permissions.map((p) => (
                    <span key={p.id} className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--muted)]">No permissions assigned</span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? `Edit ${editing.name}` : 'New role'} onClose={() => setFormOpen(false)} wide>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              saveMutation.mutate({ name, permissions: selectedPermissions })
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Role name" required value={name} onChange={(e) => setName(e.target.value)} disabled={editing?.name === 'Admin'} />
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--ink)]">Permissions</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {permissions.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.name)}
                      onChange={() => togglePermission(perm.name)}
                    />
                    {perm.name}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Save role</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
