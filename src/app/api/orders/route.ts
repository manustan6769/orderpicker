import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || null
  const to = searchParams.get('to') || null

  try {
    const { rows } = await pool.query(
      `SELECT
        o.id,
        o.ordernumber,
        o.customername,
        o.customernumber,
        o.orderdate,
        o.createdat,
        COALESCE(
          json_agg(
            json_build_object(
              'id',               p.id,
              'position',         p.position,
              'articlenumber',    p.articlenumber,
              'pro_articlenumber',p.pro_articlenumber,
              'quantity',         p.quantity
            ) ORDER BY p.position
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS positions
      FROM orders o
      LEFT JOIN order_positions p ON p.ordernumber = o.ordernumber
      WHERE ($1::date IS NULL OR o.orderdate >= $1::date)
        AND ($2::date IS NULL OR o.orderdate <= $2::date)
      GROUP BY o.id
      ORDER BY o.orderdate DESC, o.id DESC`,
      [from, to]
    )

    return NextResponse.json(rows)
  } catch (err) {
    console.error('DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  let body: { order_ids: number[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.order_ids || body.order_ids.length === 0) {
    return NextResponse.json({ error: 'No orders selected' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get ordernumbers for the selected order IDs
    const { rows: orderRows } = await client.query(
      `SELECT ordernumber FROM orders WHERE id = ANY($1::int[])`,
      [body.order_ids]
    )
    const ordernumbers = orderRows.map((r: { ordernumber: string }) => r.ordernumber)

    // Delete positions first (foreign key dependency)
    if (ordernumbers.length > 0) {
      await client.query(
        `DELETE FROM order_positions WHERE ordernumber = ANY($1::text[])`,
        [ordernumbers]
      )
    }

    // Delete orders
    const { rowCount } = await client.query(
      `DELETE FROM orders WHERE id = ANY($1::int[])`,
      [body.order_ids]
    )

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      deleted: rowCount,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Delete error:', err)
    return NextResponse.json({ error: 'Database error during delete' }, { status: 500 })
  } finally {
    client.release()
  }
}
