import { NextResponse } from 'next/server';
import { PHOTO_FILE, fetchBranchPhoto } from '@/lib/crm';
import { log } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Every upload in the CRM gets a new name, so the bytes behind a name never change. */
const IMMUTABLE = 'public, max-age=31536000, s-maxage=31536000, immutable';

/**
 * A branch facade photo, uploaded by the director in the CRM (Филиалы → Сайт). The CRM key
 * stays on this server, like every other CRM call (§4.2): `next/image` asks this route,
 * and this route asks the CRM. The CRM already re-encoded the photo (≤ 1600 px, no EXIF);
 * the image optimiser turns it into AVIF/WebP at the card's widths.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!PHOTO_FILE.test(file)) return notFound();

  let upstream: Response | null;
  try {
    upstream = await fetchBranchPhoto(file);
  } catch (err) {
    log('warn', 'branch_photo_failed', { file, error: err instanceof Error ? err.message : String(err) });
    return new NextResponse(null, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!upstream) return notFound();

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
    'Cache-Control': IMMUTABLE,
  });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new NextResponse(upstream.body, { status: 200, headers });
}

// A removed or replaced photo: short-lived, so a re-published branch is not stuck on it.
function notFound() {
  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
}
