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
