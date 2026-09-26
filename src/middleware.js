import { NextResponse } from 'next/server';

// A basic list of common bot keywords found in User-Agents
const BOT_KEYWORDS = [
  'bot', 'spider', 'crawler', 'scraper', 
  'python', 'curl', 'wget', 'axios', 'headless'
];

export function middleware(request) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // Check if the User-Agent contains any known bot keywords
  const isBot = BOT_KEYWORDS.some((keyword) => userAgent.includes(keyword));

  if (isBot) {
    // Instantly block the bot with a 403 Forbidden response at the edge
    return new NextResponse(
      JSON.stringify({ error: 'Access denied. Automated traffic blocked.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Allow legitimate users to pass through seamlessly
  return NextResponse.next();
}

// Ensure this middleware runs on every single route of your website
export const config = {
  matcher: '/:path*',
};
