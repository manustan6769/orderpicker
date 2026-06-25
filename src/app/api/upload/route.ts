import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = '/uploads'

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const files = formData.getAll('files') as File[]
  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
  } catch {
    return NextResponse.json({ error: 'Upload directory not accessible' }, { status: 500 })
  }

  const saved: { name: string; savedAs: string; size: number }[] = []

  for (const file of files) {
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const filename = `${timestamp}_${safeName}`
    const filepath = path.join(UPLOAD_DIR, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))
    saved.push({ name: file.name, savedAs: filename, size: file.size })
  }

  return NextResponse.json({ success: true, files: saved })
}
