import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { verifyAdminSession } from '@/lib/auth-server';

const filePath = path.join(process.cwd(), 'src/data/size-charts.json');

function logEvent(
  level: 'INFO' | 'WARN' | 'ERROR',
  event: string,
  details: { userId?: string; result: 'success' | 'denied' | 'failed'; reason?: string; error?: string }
) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    endpoint: '/api/admin/settings',
    ...details,
  }));
}

function validateSizeChartsPayload(body: any): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Payload must be a JSON object';
  }

  const expectedKeys = ['t-shirts', 'oversized-t-shirts', 'hoodies', 'shirts'];
  const bodyKeys = Object.keys(body);
  if (bodyKeys.length === 0) {
    return 'Payload cannot be empty';
  }

  for (const key of bodyKeys) {
    if (!expectedKeys.includes(key)) {
      return `Unexpected category key: ${key}`;
    }

    const category = body[key];
    if (typeof category !== 'object' || category === null || Array.isArray(category)) {
      return `Category '${key}' must be a JSON object`;
    }

    if (typeof category.title !== 'string' || category.title.trim() === '') {
      return `Category '${key}' has invalid or missing title`;
    }

    if (typeof category.fit !== 'string' || category.fit.trim() === '') {
      return `Category '${key}' has invalid or missing fit`;
    }

    if (!Array.isArray(category.rows) || category.rows.length === 0) {
      return `Category '${key}' must have a non-empty rows array`;
    }

    for (let i = 0; i < category.rows.length; i++) {
      const row = category.rows[i];
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        return `Row at index ${i} in category '${key}' must be a JSON object`;
      }

      if (typeof row.size !== 'string' || row.size.trim() === '') {
        return `Row at index ${i} in category '${key}' has invalid or missing size`;
      }

      const dimensions = ['chest', 'length', 'shoulder'] as const;
      for (const dim of dimensions) {
        const value = row[dim];
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `Row at index ${i} in category '${key}' has invalid or missing '${dim}' object`;
        }
        if (typeof value.in !== 'string' || value.in.trim() === '') {
          return `Row at index ${i} in category '${key}' has invalid or missing '${dim}.in' value`;
        }
        if (typeof value.cm !== 'string' || value.cm.trim() === '') {
          return `Row at index ${i} in category '${key}' has invalid or missing '${dim}.cm' value`;
        }
      }
    }
  }

  return null;
}

export async function GET() {
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to read size charts data.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // 1. Authenticate & Authorize
  const authResult = await verifyAdminSession();
  const userId = authResult.user?.id;

  if (authResult.error) {
    if (authResult.status === 401) {
      logEvent('WARN', 'Unauthorized Settings Access Attempt', { result: 'denied', reason: 'Not authenticated' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authResult.status === 403) {
      logEvent('WARN', 'Forbidden Settings Access Attempt', { userId, result: 'denied', reason: 'Not administrator' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logEvent('ERROR', 'Unexpected Authentication Error', { userId, result: 'failed', error: authResult.error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // 2. Validate request body (check if valid JSON)
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    logEvent('WARN', 'Invalid Settings Payload', { userId, result: 'failed', reason: 'Malformed JSON' });
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  // 3. Validate schema
  const schemaError = validateSizeChartsPayload(body);
  if (schemaError) {
    logEvent('WARN', 'Invalid Settings Schema', { userId, result: 'failed', reason: schemaError });
    return NextResponse.json({ error: schemaError }, { status: 400 });
  }

  // 4. Safe write file
  try {
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf8');
    logEvent('INFO', 'Settings Updated Successfully', { userId, result: 'success' });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logEvent('ERROR', 'Failed to Write Settings File', { userId, result: 'failed', error: err.message || String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
