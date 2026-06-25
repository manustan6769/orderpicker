import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const webhookTestUrl = process.env.N8N_WEBHOOK_TEST_URL

  if (!webhookUrl && !webhookTestUrl) {
    return NextResponse.json({ error: 'No N8N webhook URLs configured' }, { status: 500 })
  }

  let body: { order_ids: number[]; ordernumbers: string[]; action?: string; send_test_webhook?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.order_ids || body.order_ids.length === 0) {
    return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
  }

  const payload = JSON.stringify({
    order_ids: body.order_ids,
    ordernumbers: body.ordernumbers,
    action: body.action ?? 'auftrag_erp',
    triggered_at: new Date().toISOString(),
  })

  const urls = [webhookUrl].filter(Boolean) as string[]
  if (body.send_test_webhook && webhookTestUrl) urls.push(webhookTestUrl)
  const uniqueUrls = [...new Set(urls)]

  const results: { url: string; success: boolean; response?: unknown; error?: string }[] = []
  await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        })
        const text = await res.text()
        let parsed: unknown
        try { parsed = JSON.parse(text) } catch { parsed = text }
        results.push({ url, success: true, response: parsed })
      } catch (err) {
        console.error(`Webhook error for ${url}:`, err)
        results.push({ url, success: false, error: 'Failed to reach webhook' })
      }
    })
  )

  const anySuccess = results.some((r) => r.success)
  return NextResponse.json(
    { success: anySuccess, webhook_results: results },
    { status: anySuccess ? 200 : 502 }
  )
}
