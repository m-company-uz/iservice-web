import { NextResponse } from 'next/server';
import { probeCrm } from '@/lib/crm';

export const dynamic = 'force-dynamic';

/**
 * Always 200 while the site itself is up (§12.6): a degraded CRM must not make a platform
 * restart a healthy site. The `crm` field is what an uptime check would alert on.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', crm: await probeCrm() }, { headers: { 'Cache-Control': 'no-store' } });
}
