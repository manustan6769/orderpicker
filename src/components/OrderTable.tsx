'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Position {
  id: number
  position: string
  articlenumber: string
  pro_articlenumber: string | null
  quantity: number
}

interface Order {
  id: number
  ordernumber: string
  customername: string
  customernumber: number | null
  orderdate: string
  createdat: string
  positions: Position[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function PositionDropdown({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-400 italic">No positions found.</div>
    )
  }
  return (
    <div className="p-3">
      <table className="text-xs w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left pb-1 pr-3 font-semibold text-gray-500">Pos.</th>
            <th className="text-left pb-1 pr-3 font-semibold text-gray-500">Article#</th>
            <th className="text-left pb-1 pr-3 font-semibold text-gray-500">PRO Article#</th>
            <th className="text-right pb-1 font-semibold text-gray-500">Qty</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 pr-3 text-gray-700">{p.position}</td>
              <td className="py-1.5 pr-3 text-gray-700 font-mono">{p.articlenumber}</td>
              <td className="py-1.5 pr-3 text-gray-500">{p.pro_articlenumber ?? '—'}</td>
              <td className="py-1.5 text-right text-gray-700 font-medium">{p.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [combining, setCombining] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Track which order's positions dropdown is expanded (by order id), null = none
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  const fetchOrders = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data: Order[] = await res.json()
      setOrders(data)
      setSelected(new Set())
      setExpandedOrderId(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders('', '')
  }, [fetchOrders])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    fetchOrders(fromDate, toDate)
  }

  function handleClearFilter() {
    setFromDate('')
    setToDate('')
    fetchOrders('', '')
  }

  const allSelected = orders.length > 0 && selected.size === orders.length
  const someSelected = selected.size > 0 && selected.size < orders.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map((o) => o.id)))
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleCombine() {
    if (selected.size === 0) return
    setCombining(true)
    const selectedOrders = orders.filter((o) => selected.has(o.id))
    try {
      const res = await fetch('/api/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_ids: selectedOrders.map((o) => o.id),
          ordernumbers: selectedOrders.map((o) => o.ordernumber),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      showToast('success', `✓ Sent ${selected.size} order(s) to n8n successfully.`)
      setSelected(new Set())
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Failed to send to n8n')
    } finally {
      setCombining(false)
    }
  }

  function togglePositionsDropdown(orderId: number) {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  return (
    <div>
      {/* Filter bar */}
      <form
        onSubmit={handleFilter}
        className="flex flex-wrap items-end gap-3 mb-5 bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Apply Filter
        </button>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={handleClearFilter}
            className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Status */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          Error: {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            No orders found for the selected date range.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Order #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Order Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Positions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className={`cursor-pointer transition-colors ${
                      selected.has(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleOne(order.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{order.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{order.ordernumber}</td>
                    <td className="px-4 py-3 text-gray-700">{order.customername}</td>
                    <td className="px-4 py-3 text-gray-500">{order.customernumber ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(order.orderdate)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => togglePositionsDropdown(order.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          expandedOrderId === order.id
                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        {order.positions.length} item{order.positions.length !== 1 ? 's' : ''}
                        <svg
                          className={`w-3 h-3 transition-transform ${
                            expandedOrderId === order.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr key={`${order.id}-positions`} className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-0">
                        <div className="ml-8 mr-4 my-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="px-3 pt-2 pb-1 border-b border-gray-100">
                            <span className="text-xs font-semibold text-gray-500">
                              Positions for order{' '}
                              <span className="text-gray-800">{order.ordernumber}</span>
                            </span>
                          </div>
                          <PositionDropdown positions={order.positions} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {selected.size > 0
            ? `${selected.size} order${selected.size !== 1 ? 's' : ''} selected`
            : `${orders.length} order${orders.length !== 1 ? 's' : ''} total`}
        </p>

        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <span className="text-xs text-gray-400">
              IDs: {[...selected].sort((a, b) => a - b).join(', ')}
            </span>
          )}
          <button
            onClick={handleCombine}
            disabled={selected.size === 0 || combining}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selected.size === 0 || combining
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
            }`}
          >
            {combining ? 'Sending…' : `Combine${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
