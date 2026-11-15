import Link from 'next/link';
import { ArrowUpRight, QrCode } from 'lucide-react';

/**
 * 🦶 Footer Component
 * Minimal enterprise footer
 */
export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-neutral-950">
      {/* Subtle background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.05),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
      </div>

      <div className="container relative px-4 py-16 lg:py-20">
        {/* Top: claim + pills + connect */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-7">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/12">
                <QrCode className="h-7 w-7 text-white" />
              </span>
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">Kids4Safe</span>
            </Link>

            <p className="mt-4 max-w-xl text-base sm:text-lg text-white/60 leading-relaxed">
              Monitoreo remoto con trazabilidad forense.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Documentación
              </Link>
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                API
              </Link>
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Seguridad
              </Link>
              <Link
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Contacto
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 lg:pt-2 lg:justify-self-end">
            <div className="max-w-md">
              <p className="text-lg sm:text-xl font-semibold tracking-tight text-white/70">Mantente conectado</p>
              <div className="mt-6 flex items-end gap-3">
                <div className="flex-1">
                  <label htmlFor="footer-email" className="sr-only">
                    Enter your email
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    inputMode="email"
                    placeholder="Enter your email"
                    className="w-full bg-transparent pb-3 text-sm text-white/80 placeholder:text-white/35 outline-none border-b border-white/15 focus:border-white/35"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.03] ring-1 ring-white/12 text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                  aria-label="Enviar"
                >
                  <ArrowUpRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-14 lg:gap-20">
          {/* Brand */}
          <div className="space-y-3 pt-12 md:pt-14">
            <p className="text-sm text-white/50 leading-relaxed">
              Vigilancia en tiempo real
            </p>
          </div>
          
          {/* Product */}
          <div className="pt-12 md:pt-14">
            <h3 className="text-xs font-semibold mb-5 text-white/90 uppercase tracking-[0.18em]">Productos</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/features" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Tunel Qr
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Login Qr
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  App móvil
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Panel administrativo
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Company */}
          <div className="pt-12 md:pt-14">
            <h3 className="text-xs font-semibold mb-5 text-white/90 uppercase tracking-[0.18em]">Compañia</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  ¿Por qué Kids4Safe?
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Documentacion 
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Podcast 
                </Link>
              </li>
              
            </ul>
          </div>
          
          {/* Legal */}
          <div className="pt-12 md:pt-14">
            <h3 className="text-xs font-semibold mb-5 text-white/90 uppercase tracking-[0.18em]">Legal</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/privacy" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/policy" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Políticas
                </Link>
              </li>
              <li>
                <Link href="/policy" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                  Responsabilidad
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="mt-14 pt-10 border-t border-white/10 text-center">
          <p className="text-sm text-white/45">
            © 2026 Kids4Safe. All rights reserved.
          </p>
          <p className="font-black mt-2 text-sm text-white/80">
            Backed by{' '}
            <Link
              href="/"
              target="_blank"
              rel="noreferrer noopener"
              className="font-black text-blue-600 hover:text-blue-500 transition-colors"
            >
              Kids4Safe
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
