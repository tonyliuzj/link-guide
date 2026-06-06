import { NextResponse } from 'next/server';

export const publicApiCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function publicApiOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: publicApiCorsHeaders,
  });
}

export function publicApiJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...publicApiCorsHeaders,
      ...init?.headers,
    },
  });
}

export function publicApiText(body: string, init?: ResponseInit) {
  return new NextResponse(body, {
    ...init,
    headers: {
      ...publicApiCorsHeaders,
      ...init?.headers,
    },
  });
}
