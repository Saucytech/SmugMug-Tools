import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Clear authentication cookies
  response.cookies.delete('smugmug_access_token');
  response.cookies.delete('smugmug_access_token_secret');

  return response;
}