import { isLocale } from '@koode/contracts';
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/sw.js')
  ) {
    return NextResponse.next();
  }

  const segment = pathname.split('/')[1];
  if (segment && isLocale(segment)) {
    return NextResponse.next();
  }

  const preferred = request.cookies.get('koode_locale')?.value;
  const locale = preferred && isLocale(preferred) ? preferred : 'en';
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
