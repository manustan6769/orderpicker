import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'N8N_WEBHOOK_URL is not configured' },
      { status: 500 }
    )
  }

  let body: { order_ids: number[]; ordernumbers: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.order_ids || body.order_ids.length === 0) {
    return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_ids: body.order_ids,
        ordernumbers: body.ordernumbers,
        triggered_at: new Date().toISOString(),
      }),
    })

    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = text }

    return NextResponse.json({ success: true, n8n_response: data }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Failed to reach n8n webhook' }, { status: 502 })
  }
}
