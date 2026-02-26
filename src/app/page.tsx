import OrderTable from '@/components/OrderTable'

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Picker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select orders and combine them for processing in n8n.
        </p>
      </div>
      <OrderTable />
    </main>
  )
}
