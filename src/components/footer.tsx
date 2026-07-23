import Link from 'next/link';
import { client } from '@/sanity/lib/client';

interface FooterCategory {
  _id: string;
  name: string;
  slug?: { current: string };
}

export async function Footer() {
  const categories = await client.fetch<FooterCategory[]>(`*[_type == "category" && slug.current != "joggers"] | order(displayOrder asc)`);

  return (
    <footer className="bg-[#141414] text-[#f5f5f5] border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-xl tracking-tighter uppercase text-white">BADGER SHEILD</h3>
            <p className="text-white/60 text-sm max-w-xs leading-relaxed font-light">
              Minimalist luxury clothing designed for the modern individual. Quality over quantity.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-white">Shop</h4>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category._id}>
                  <Link href={`/products?category=${category.slug?.current}`} className="text-white/60 hover:text-white text-sm transition-colors font-light">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-white">Support</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/faq" className="hover:text-white transition-colors font-light">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors font-light">Contact Us</Link></li>
              <li><Link href="/size-guide" className="hover:text-white transition-colors font-light">Size Guide</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/terms" className="hover:text-white transition-colors font-light">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors font-light">Privacy Policy</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors font-light">Return Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 uppercase tracking-wider text-sm text-white">FOLLOW US</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <a
                  href="https://www.instagram.com/badger_sheild/?utm_source=ig_web_button_share_sheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors font-light"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  <span>Instagram</span>
                </a>
              </li>

              <li>
                <a
                  href="https://www.facebook.com/share/1Crw5v8Pn8/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors font-light"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                  <span>Facebook</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40 font-light">
            &copy; {new Date().getFullYear()} BADGER SHEILD. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-white/40 cursor-pointer hover:text-white transition-colors font-light">Instagram</span>
            <span className="text-xs text-white/40 cursor-pointer hover:text-white transition-colors font-light">Twitter</span>
            <span className="text-xs text-white/40 cursor-pointer hover:text-white transition-colors font-light">Pinterest</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
