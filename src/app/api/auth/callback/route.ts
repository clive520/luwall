import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { createSessionCookie } from '@/lib/auth/session';
import { User } from '@/types';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    return NextResponse.redirect(`${origin}/auth/callback?code=${encodeURIComponent(code)}`);
  }

  return NextResponse.redirect(`${origin}/auth/callback`);
}
