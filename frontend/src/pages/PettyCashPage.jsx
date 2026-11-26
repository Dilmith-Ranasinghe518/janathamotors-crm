import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Printer,
  Paperclip,
  Trash2,
  Eye,
  ArrowUpRight,
  Filter,
  Check,
  X,
  Store as StoreIcon,
  Calendar,
  AlertCircle,
  Receipt,
  Download,
} from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  'Office & Stationery',
  'Tea, Coffee & Refreshments',
  'Fuel & Travel Expenses',
  'Vehicle Repairs & Supplies',
  'Postage & Courier',
  'Cleaning & Sanitation',
  'Tools & Hardware',
  'Utilities & Minor Bills',
  'Staff Welfare & Meals',
  'Emergency Purchase',
  'Other Expenses',
]

const emptyRequest = {
  amount: '',
  category: CATEGORIES[0],
  custom_category: '',
  description: '',
  expense_date: new Date().toISOString().split('T')[0],
  store_id: '',
  receipt_reference: '',
}

const emptyTopUp = {
  amount: '',
  source: 'Bank Withdrawal',
  reference_no: '',
  notes: '',
  store_id: '',
}

export function PettyCashPage() {
  const { user, can, hasRole } = useAuth()
  const queryClient = useQueryClient()

  const isPrivileged = hasRole ? (hasRole('Admin') || hasRole('Finance Admin')) : Boolean(user?.roles?.includes('Admin') || user?.roles?.includes('Finance Admin'))
  const canApprove = isPrivileged || can('approve_petty_cash')
  const canDisburse = isPrivileged || can('disburse_petty_cash')
  const canManage = isPrivileged || can('manage_petty_cash')
  const canRequest = isPrivileged || can('request_petty_cash')

  // Filters & State
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [myOnly, setMyOnly] = useState(false)
  const [page, setPage] = useState(1)

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestForm, setRequestForm] = useState(emptyRequest)
  const [receiptFile, setReceiptFile] = useState(null)

  const [topUpModalOpen, setTopUpModalOpen] = useState(false)
  const [topUpForm, setTopUpForm] = useState(emptyTopUp)

  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const [approvalModalVoucher, setApprovalModalVoucher] = useState(null)
  const [approvalNotes, setApprovalNotes] = useState('')

  const [rejectModalVoucher, setRejectModalVoucher] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [disburseModalVoucher, setDisburseModalVoucher] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [pdfLoadingId, setPdfLoadingId] = useState(null)
  const [error, setError] = useState('')

  // Queries
  const summaryQuery = useQuery({
    queryKey: ['petty-cash-summary'],
    queryFn: () => api.get('/petty-cash/summary').then((r) => r.data),
  })

  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data?.data ?? r.data ?? []),
  })
  const stores = storesQuery.data ?? []

  const requestsQuery = useQuery({
    queryKey: ['petty-cash', activeTab, search, categoryFilter, storeFilter, fromDate, toDate, myOnly, page],
    queryFn: () =>
      api
        .get('/petty-cash', {
          params: {
            status: activeTab !== 'all' ? activeTab : undefined,
            search: search || undefined,
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            store_id: storeFilter !== 'all' ? storeFilter : undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            my_requests: myOnly ? 1 : undefined,
            page,
          },
        })
        .then((r) => r.data),
  })

  const requestsData = requestsQuery.data?.data ?? []
  const pagination = requestsQuery.data ?? {}
  const summary = summaryQuery.data ?? {}

  // Mutations
  const createRequestMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/petty-cash', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] })
      queryClient.invalidateQueries({ queryKey: ['petty-cash-summary'] })
      closeRequestModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Failed to submit petty cash request.')),
  })

  const topUpMutation = useMutation({
    mutationFn: (payload) => api.post('/petty-cash/top-up', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash-summary'] })
      queryClient.invalidateQueries({ queryKey: ['petty-cash-top-ups'] })
      closeTopUpModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Failed to record top up.')),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => api.post(`/petty-cash/${id}/approve`, { approval_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] })
      queryClient.invalidateQueries({ queryKey: ['petty-cash-summary'] })
      setApprovalModalVoucher(null)
      setApprovalNotes('')
    },
    onError: (err) => setError(apiErrorMessage(err, 'Failed to approve request.')),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/petty-cash/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] })
      queryClient.invalidateQueries({ queryKey: ['petty-cash-summary'] })
      setRejectModalVoucher(null)
      setRejectionReason('')
    },
    onError: (err) => setError(apiErrorMessage(err, 'Failed to reject request.')),
  })

  const disburseMutation = useMutation({
    mutationFn: ({ id, method, notes }) =>
      api.post(`/petty-cash/${id}/disburse`, { payment_method: method, payment_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] })
      queryClient.invalidateQueries({ queryKey: ['petty-cash-summary'] })
      setDisburseModalVoucher(null)
      setPaymentNotes('')
    },
    onError: (err) => setError(apiErrorMessage(err, 'Failed to record cash disbursement.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/petty-cash/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petty-cash'] })
      queryClient.invalidateQueries({ queryKey: ['petty-cash-summary'] })
    },
    onError: (err) => setError(apiErrorMessage(err, 'Failed to delete petty cash request.')),
  })

  // Handlers
  function closeRequestModal() {
    setRequestModalOpen(false)
    setRequestForm(emptyRequest)
    setReceiptFile(null)
    setError('')
  }

  function handleRequestSubmit(e) {
    e.preventDefault()
    setError('')
    const finalCategory =
      requestForm.category === 'Other Expenses' && requestForm.custom_category
        ? requestForm.custom_category
        : requestForm.category

    const fd = new FormData()
    fd.append('amount', requestForm.amount)
    fd.append('category', finalCategory)
    fd.append('description', requestForm.description)
    fd.append('expense_date', requestForm.expense_date)
    if (requestForm.store_id) fd.append('store_id', requestForm.store_id)
    if (requestForm.receipt_reference) fd.append('receipt_reference', requestForm.receipt_reference)
    if (receiptFile) fd.append('receipt', receiptFile)

    createRequestMutation.mutate(fd)
  }

  function closeTopUpModal() {
    setTopUpModalOpen(false)
    setTopUpForm(emptyTopUp)
    setError('')
  }

  function handleTopUpSubmit(e) {
    e.preventDefault()
    setError('')
    topUpMutation.mutate({
      amount: parseFloat(topUpForm.amount),
      source: topUpForm.source,
      reference_no: topUpForm.reference_no || null,
      notes: topUpForm.notes || null,
      store_id: topUpForm.store_id ? parseInt(topUpForm.store_id) : null,
    })
  }

  async function openPdf(voucher) {
    setPdfLoadingId(voucher.id)
    try {
      const response = await api.get(`/petty-cash/${voucher.id}/pdf`, { responseType: 'blob' })
      const file = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(file)
      window.open(url, '_blank')
    } catch {
      alert('Could not generate voucher PDF.')
    } finally {
      setPdfLoadingId(null)
    }
  }

  function handleDelete(voucher) {
    if (window.confirm(`Delete petty cash request ${voucher.voucher_no}?`)) {
      deleteMutation.mutate(voucher.id)
    }
  }

  const formatLKR = (val) =>
    `LKR ${(Number(val) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Petty Cash"
        description="Manage cash floats, staff expense requests, Finance Admin approvals, and disbursements."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button
                variant="secondary"
                onClick={() => setTopUpModalOpen(true)}
                className="flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                <span>Top Up Float</span>
              </Button>
            )}
            {canRequest && (
              <Button
                variant="primary"
                onClick={() => setRequestModalOpen(true)}
                className="flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                <span>New Petty Cash Request</span>
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--critical)] bg-[var(--critical-soft)] p-3.5 text-sm text-[var(--critical)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Balance Float */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Current Cash Float
            </span>
            <div className="rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {formatLKR(summary.current_balance)}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Total Top-ups: {formatLKR(summary.total_top_ups)}
          </p>
        </Card>

        {/* Card 2: Spent This Month */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Spent This Month
            </span>
            <div className="rounded-lg bg-[var(--paper)] p-2 text-[var(--ink)]">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {formatLKR(summary.spent_this_month)}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            All-time Disbursed: {formatLKR(summary.total_disbursed)}
          </p>
        </Card>

        {/* Card 3: Pending Approvals */}
        <Card
          className={`p-4 sm:p-5 transition ${
            (summary.pending_count || 0) > 0 ? 'border-[var(--warning)]/50 bg-[var(--warning-soft)]/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Pending Approval
            </span>
            <div className="rounded-lg bg-[var(--warning-soft)] p-2 text-[var(--warning)]">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {summary.pending_count ?? 0}{' '}
            <span className="text-xs font-normal text-[var(--muted)]">requests</span>
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--warning)]">
            Amount: {formatLKR(summary.pending_amount)}
          </p>
        </Card>

        {/* Card 4: Approved / Ready to Pay */}
        <Card
          className={`p-4 sm:p-5 transition ${
            (summary.approved_count || 0) > 0 ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Ready for Payout
            </span>
            <div className="rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
            {summary.approved_count ?? 0}{' '}
            <span className="text-xs font-normal text-[var(--muted)]">approved</span>
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--accent)]">
            Amount: {formatLKR(summary.approved_amount)}
          </p>
        </Card>
      </div>

      {/* Main Content Card: Tabs & Filters */}
      <Card className="overflow-hidden">
        {/* Status Tabs */}
        <div className="flex flex-wrap border-b border-[var(--line)] bg-[var(--paper)]/50 px-4 pt-3 gap-1">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending Approval', count: summary.pending_count },
            { id: 'approved', label: 'Ready for Cash', count: summary.approved_count },
            { id: 'paid', label: 'Paid / Disbursed' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setPage(1)
              }}
              className={`relative flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    tab.id === 'pending'
                      ? 'bg-[var(--warning)] text-white'
                      : 'bg-[var(--accent)] text-white'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 border-b border-[var(--line)] bg-[var(--surface)]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search voucher, staff, purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] py-2 pl-9 pr-3 text-xs outline-none focus:border-[var(--accent)] text-[var(--ink)]"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)] text-[var(--ink)]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Store */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)] text-[var(--ink)]"
          >
            <option value="all">All Outlets</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code || s.location})
              </option>
            ))}
          </select>

          {/* Date from */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="From Date"
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)] text-[var(--ink)]"
          />

          {/* Date to & Mine filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="To Date"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)] text-[var(--ink)]"
            />
            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer text-[var(--muted)] hover:text-[var(--ink)] select-none">
              <input
                type="checkbox"
                checked={myOnly}
                onChange={(e) => setMyOnly(e.target.checked)}
                className="rounded border-[var(--line)]"
              />
              <span>Mine</span>
            </label>
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--line)] bg-[var(--paper)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Voucher No</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Requester (Staff)</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 min-w-[220px]">Purpose / Description</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Amount (LKR)</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {requestsData.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No petty cash requests found." />
                  </td>
                </tr>
              ) : (
                requestsData.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-[var(--paper)]/40 transition group"
                  >
                    {/* Voucher No */}
                    <td className="px-4 py-3 font-mono font-bold text-[var(--ink)] whitespace-nowrap">
                      <span className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-[11px]">
                        {v.voucher_no}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--muted)]">
                      {v.expense_date}
                    </td>

                    {/* Requester */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-[var(--ink)]">{v.user?.name ?? 'Staff'}</div>
                      <div className="text-[10px] text-[var(--muted)]">
                        {v.store?.name ? `${v.store.name}` : 'Main Store'}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded-full bg-[var(--line)]/60 px-2 py-0.5 text-[11px] font-medium text-[var(--ink)]">
                        {v.category}
                      </span>
                    </td>

                    {/* Purpose / Receipt */}
                    <td className="px-4 py-3">
                      <div className="text-[var(--ink)] line-clamp-2 max-w-sm">{v.description}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                        {v.receipt_reference && (
                          <span className="font-mono bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">
                            Ref: {v.receipt_reference}
                          </span>
                        )}
                        {v.receipt_url && (
                          <a
                            href={v.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[var(--accent)] hover:underline font-semibold"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span>Receipt</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[var(--ink)] whitespace-nowrap">
                      {(Number(v.amount) || 0).toLocaleString('en-LK', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          v.status === 'paid'
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : v.status === 'approved'
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                            : v.status === 'pending'
                            ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                            : 'bg-[var(--critical-soft)] text-[var(--critical)]'
                        }`}
                      >
                        {v.status === 'paid' ? 'Paid / Disbursed' : v.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedVoucher(v)
                            setDetailsModalOpen(true)
                          }}
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--ink)] hover:bg-[var(--paper)] transition"
                          title="View Voucher Details & History"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Print Voucher PDF */}
                        <button
                          onClick={() => openPdf(v)}
                          disabled={pdfLoadingId === v.id}
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--ink)] hover:bg-[var(--paper)] transition disabled:opacity-50"
                          title="Print / Download Voucher Slip"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {/* Approve & Reject for Finance Admin / Admin on Pending */}
                        {v.status === 'pending' && canApprove && (
                          <>
                            <button
                              onClick={() => {
                                setApprovalModalVoucher(v)
                                setApprovalNotes('')
                              }}
                              className="flex items-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--accent)] hover:opacity-90 transition shadow-2xs"
                              title="Approve this petty cash request"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalVoucher(v)
                                setRejectionReason('')
                              }}
                              className="flex items-center gap-1 rounded-lg border border-[var(--critical)] bg-[var(--critical-soft)] px-2 py-1 text-xs font-bold text-[var(--critical)] hover:opacity-90 transition shadow-2xs"
                              title="Reject this petty cash request"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* Disburse / Cash Payout for Approved */}
                        {v.status === 'approved' && canDisburse && (
                          <button
                            onClick={() => {
                              setDisburseModalVoucher(v)
                              setPaymentMethod('Cash')
                              setPaymentNotes('')
                            }}
                            className="flex items-center gap-1 rounded-lg border border-[var(--success)] bg-[var(--success-soft)] px-2.5 py-1 text-xs font-bold text-[var(--success)] hover:opacity-90 transition shadow-2xs"
                            title="Disburse cash to staff member"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Pay Out</span>
                          </button>
                        )}

                        {/* Delete for Pending Request Owner or Admin */}
                        {(v.status === 'pending' && (v.user_id === user?.id || isPrivileged)) && (
                          <button
                            onClick={() => handleDelete(v)}
                            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--critical)] hover:bg-[var(--critical-soft)] transition"
                            title="Cancel / Delete Request"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.per_page && (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
            <div>
              Showing {pagination.from} to {pagination.to} of {pagination.total} requests
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pagination.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="py-1 px-3 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="py-1 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL 1: New Petty Cash Request */}
      {requestModalOpen && (
        <Modal title="Submit Petty Cash Request" onClose={closeRequestModal} wide>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Amount (LKR) *"
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 2500.00"
                value={requestForm.amount}
                onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
              />

              <Input
                label="Expense Date *"
                type="date"
                required
                value={requestForm.expense_date}
                onChange={(e) => setRequestForm({ ...requestForm, expense_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Expense Category *"
                value={requestForm.category}
                onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>

              <Select
                label="Outlet / Store"
                value={requestForm.store_id}
                onChange={(e) => setRequestForm({ ...requestForm, store_id: e.target.value })}
              >
                <option value="">Main Store / Default</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || s.location})
                  </option>
                ))}
              </Select>
            </div>

            {requestForm.category === 'Other Expenses' && (
              <Input
                label="Specify Category Name *"
                required
                placeholder="e.g. Electrical maintenance"
                value={requestForm.custom_category}
                onChange={(e) => setRequestForm({ ...requestForm, custom_category: e.target.value })}
              />
            )}

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Purpose / Expenditure Details *</span>
              <textarea
                required
                rows={3}
                placeholder="Explain what the petty cash was spent on or is needed for..."
                value={requestForm.description}
                onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bill / Receipt / Ref Number"
                placeholder="e.g. INV-9042 or Cash Memo #12"
                value={requestForm.receipt_reference}
                onChange={(e) => setRequestForm({ ...requestForm, receipt_reference: e.target.value })}
              />

              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-[var(--ink)]">Attach Receipt / Bill Photo</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-2 text-xs text-[var(--ink)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={closeRequestModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? 'Submitting…' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Top Up Float */}
      {topUpModalOpen && (
        <Modal title="Top Up Petty Cash Float" onClose={closeTopUpModal}>
          <form onSubmit={handleTopUpSubmit} className="space-y-4">
            <div className="rounded-lg bg-[var(--paper)] p-3 text-xs text-[var(--muted)]">
              Current Float Balance:{' '}
              <b className="text-[var(--ink)] text-sm">{formatLKR(summary.current_balance)}</b>
            </div>

            <Input
              label="Top Up Amount (LKR) *"
              type="number"
              step="0.01"
              min="1"
              required
              placeholder="e.g. 20000.00"
              value={topUpForm.amount}
              onChange={(e) => setTopUpForm({ ...topUpForm, amount: e.target.value })}
            />

            <Select
              label="Source of Funds *"
              value={topUpForm.source}
              onChange={(e) => setTopUpForm({ ...topUpForm, source: e.target.value })}
            >
              <option value="Bank Withdrawal">Bank Withdrawal</option>
              <option value="Main Cash Register">Main Cash Register / Sales Drawer</option>
              <option value="Director / Owner Deposit">Director / Owner Deposit</option>
              <option value="Company Cheque">Company Cheque</option>
              <option value="Other Source">Other Source</option>
            </Select>

            <Input
              label="Reference / Cheque Number"
              placeholder="e.g. CHQ-48102 or Slip #88"
              value={topUpForm.reference_no}
              onChange={(e) => setTopUpForm({ ...topUpForm, reference_no: e.target.value })}
            />

            <Select
              label="Outlet / Store"
              value={topUpForm.store_id}
              onChange={(e) => setTopUpForm({ ...topUpForm, store_id: e.target.value })}
            >
              <option value="">Main Store Float</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Input
              label="Notes (Optional)"
              placeholder="e.g. Monthly replenishment"
              value={topUpForm.notes}
              onChange={(e) => setTopUpForm({ ...topUpForm, notes: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={closeTopUpModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={topUpMutation.isPending}>
                {topUpMutation.isPending ? 'Recording…' : 'Add to Float'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Finance Admin Approval Modal */}
      {approvalModalVoucher && (
        <Modal
          title={`Approve Petty Cash Voucher: ${approvalModalVoucher.voucher_no}`}
          onClose={() => setApprovalModalVoucher(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Requester:</span>
                <span className="font-semibold text-[var(--ink)]">{approvalModalVoucher.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Category:</span>
                <span className="font-semibold text-[var(--ink)]">{approvalModalVoucher.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Requested Amount:</span>
                <span className="font-bold text-sm text-[var(--ink)]">
                  {formatLKR(approvalModalVoucher.amount)}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--line)] text-[var(--ink)]">
                <span className="font-semibold">Purpose:</span> {approvalModalVoucher.description}
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Approval Note (Optional)</span>
              <input
                type="text"
                placeholder="e.g. Verified with receipt / Approved for immediate payment"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={() => setApprovalModalVoucher(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({ id: approvalModalVoucher.id, notes: approvalNotes })
                }
              >
                {approveMutation.isPending ? 'Approving…' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Reject Modal */}
      {rejectModalVoucher && (
        <Modal
          title={`Reject Request: ${rejectModalVoucher.voucher_no}`}
          onClose={() => setRejectModalVoucher(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3 space-y-1 text-xs">
              <div>
                <span className="text-[var(--muted)]">Requester:</span>{' '}
                <b className="text-[var(--ink)]">{rejectModalVoucher.user?.name}</b>
              </div>
              <div>
                <span className="text-[var(--muted)]">Amount:</span>{' '}
                <b className="text-[var(--ink)]">{formatLKR(rejectModalVoucher.amount)}</b>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Reason for Rejection *</span>
              <textarea
                required
                rows={3}
                placeholder="Explain why this request cannot be approved..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3 text-xs text-[var(--ink)] outline-none focus:border-[var(--critical)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={() => setRejectModalVoucher(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({ id: rejectModalVoucher.id, reason: rejectionReason })
                }
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: Disburse / Payout Modal */}
      {disburseModalVoucher && (
        <Modal
          title={`Disburse Cash: ${disburseModalVoucher.voucher_no}`}
          onClose={() => setDisburseModalVoucher(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success-soft)]/20 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Pay to (Requester):</span>
                <span className="font-bold text-sm text-[var(--ink)]">{disburseModalVoucher.user?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Payable Amount:</span>
                <span className="font-mono text-base font-bold text-[var(--success)]">
                  {formatLKR(disburseModalVoucher.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Approved By:</span>
                <span className="font-medium text-[var(--ink)]">
                  {disburseModalVoucher.approver?.name || 'Finance Admin'}
                </span>
              </div>
            </div>

            <Select
              label="Disbursement Method *"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash in Hand / Drawer">Cash in Hand / Drawer</option>
              <option value="Main Petty Cash Box">Main Petty Cash Box</option>
              <option value="Main Safe">Main Safe</option>
              <option value="Online / Bank Transfer">Online / Bank Transfer</option>
            </Select>

            <Input
              label="Payment Reference / Notes"
              placeholder="e.g. Handed to staff cashier / cash voucher signed"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={() => setDisburseModalVoucher(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={disburseMutation.isPending}
                onClick={() =>
                  disburseMutation.mutate({
                    id: disburseModalVoucher.id,
                    method: paymentMethod,
                    notes: paymentNotes,
                  })
                }
              >
                {disburseMutation.isPending ? 'Processing…' : 'Confirm Cash Payout'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 6: Voucher Details & Audit Trail */}
      {detailsModalOpen && selectedVoucher && (
        <Modal
          title={`Voucher Details: ${selectedVoucher.voucher_no}`}
          onClose={() => setDetailsModalOpen(false)}
          wide
        >
          <div className="space-y-5">
            {/* Top Status & Amount */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-[var(--muted)]">Voucher Status</span>
                <div className="mt-0.5">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      selectedVoucher.status === 'paid'
                        ? 'bg-[var(--success-soft)] text-[var(--success)]'
                        : selectedVoucher.status === 'approved'
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : selectedVoucher.status === 'pending'
                        ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'bg-[var(--critical-soft)] text-[var(--critical)]'
                    }`}
                  >
                    {selectedVoucher.status}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-[var(--muted)]">Total Amount</span>
                <div className="font-mono text-xl font-bold text-[var(--ink)]">
                  {formatLKR(selectedVoucher.amount)}
                </div>
              </div>
            </div>

            {/* Grid of info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 rounded-lg border border-[var(--line)] p-3">
                <div className="font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-1.5">
                  Request Information
                </div>
                <div>
                  <span className="text-[var(--muted)]">Requester:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.user?.name}</b>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Expense Date:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.expense_date}</b>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Category:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.category}</b>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Store / Outlet:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.store?.name || 'Main Store'}</b>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Bill / Ref:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.receipt_reference || '—'}</b>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--line)] p-3">
                <div className="font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-1.5">
                  Approval & Payout History
                </div>
                <div>
                  <span className="text-[var(--muted)]">Approved By:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.approver?.name || '—'}</b>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Approved At:</span>{' '}
                  <span className="text-[var(--ink)]">{selectedVoucher.approved_at || '—'}</span>
                </div>
                {selectedVoucher.approval_notes && (
                  <div>
                    <span className="text-[var(--muted)]">Approval Note:</span>{' '}
                    <span className="text-[var(--ink)]">{selectedVoucher.approval_notes}</span>
                  </div>
                )}
                {selectedVoucher.rejection_reason && (
                  <div className="text-[var(--critical)]">
                    <span className="font-semibold">Rejection Reason:</span> {selectedVoucher.rejection_reason}
                  </div>
                )}
                <div className="pt-1.5 border-t border-[var(--line)]">
                  <span className="text-[var(--muted)]">Disbursed By:</span>{' '}
                  <b className="text-[var(--ink)]">{selectedVoucher.payer?.name || '—'}</b>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Paid At:</span>{' '}
                  <span className="text-[var(--ink)]">{selectedVoucher.paid_at || '—'}</span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Method:</span>{' '}
                  <span className="text-[var(--ink)]">{selectedVoucher.payment_method || '—'}</span>
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="rounded-lg border border-[var(--line)] p-3 text-xs">
              <span className="font-semibold text-[var(--ink)]">Expenditure Details:</span>
              <p className="mt-1 text-[var(--ink)] whitespace-pre-line">{selectedVoucher.description}</p>
            </div>

            {/* Receipt Preview if attached */}
            {selectedVoucher.receipt_url && (
              <div className="rounded-lg border border-[var(--line)] p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4" /> Attached Receipt / Bill
                  </span>
                  <a
                    href={selectedVoucher.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" /> Download / Open
                  </a>
                </div>
                {selectedVoucher.receipt_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <div className="max-h-64 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-center">
                    <img
                      src={selectedVoucher.receipt_url}
                      alt="Receipt"
                      className="max-h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-[var(--paper)] rounded text-[var(--muted)]">
                    PDF Document Attached
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex justify-between items-center pt-4 border-t border-[var(--line)]">
              <Button
                variant="secondary"
                onClick={() => openPdf(selectedVoucher)}
                disabled={pdfLoadingId === selectedVoucher.id}
                className="flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Voucher</span>
              </Button>

              <Button variant="secondary" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
