// 'use client';

// import Link from 'next/link';
// import { QrCode, Menu, X } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';

// /**
//  * 🎯 Header Component
//  * Navigation header for marketing pages
//  */
// export function Header() {
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
//   return (
//     <header className="sticky top-0 z-50 w-full bg-white dark:bg-background border-b border-neutral-200 dark:border-neutral-800">
//       <nav className="container flex h-16 items-center justify-between px-4">
//         {/* Logo */}
//         <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
//           <QrCode className="w-5 h-5 text-neutral-900 dark:text-white" />
//           <span className="text-base font-semibold text-neutral-900 dark:text-white">
//             Kids4Safe
//           </span>
//         </Link>
        
//         {/* Desktop Navigation */}
//         <div className="hidden md:flex items-center gap-6">
//           <Link 
//             href="/features" 
//             className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
//           >
//             Características
//           </Link>
//           <Link 
//             href="/pricing" 
//             className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
//           >
//             Precios
//           </Link>
//           <Link 
//             href="/about" 
//             className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
//           >
//             Acerca de
//           </Link>
//         </div>
        
//         {/* CTA Buttons */}
//         <div className="hidden md:flex items-center gap-3">
//           <Button variant="ghost" size="sm">
//             Ingresar
//           </Button>
//           <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
//             Comenzar Gratis
//           </Button>
//         </div>
        
//         {/* Mobile Menu Button */}
//         <button
//           onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//           className="md:hidden p-2 rounded-lg hover:bg-accent"
//         >
//           {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
//         </button>
//       </nav>
      
//       {/* Mobile Menu */}
//       <AnimatePresence>
//         {mobileMenuOpen && (
//           <motion.div
//             initial={{ opacity: 0, height: 0 }}
//             animate={{ opacity: 1, height: 'auto' }}
//             exit={{ opacity: 0, height: 0 }}
//             className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-background"
//           >
//             <div className="container px-4 py-4 space-y-3">
//               <Link 
//                 href="/features"
//                 className="block px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Características
//               </Link>
//               <Link 
//                 href="/pricing"
//                 className="block px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Precios
//               </Link>
//               <Link 
//                 href="/about"
//                 className="block px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent"
//                 onClick={() => setMobileMenuOpen(false)}
//               >
//                 Acerca de
//               </Link>
//               <div className="pt-3 space-y-2">
//                 <Button variant="outline" className="w-full">
//                   Ingresar
//                 </Button>
//                 <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
//                   Comenzar Gratis
//                 </Button>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </header>
//   );
// }
