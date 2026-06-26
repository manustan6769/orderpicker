import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
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

export async function DELETE(request: NextRequest) {
  let body: { filename: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  // Prevent path traversal
  const safe = path.basename(body.filename)
  const filepath = path.join(UPLOAD_DIR, safe)

  try {
    await unlink(filepath)
    return NextResponse.json({ success: true, deleted: safe })
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
