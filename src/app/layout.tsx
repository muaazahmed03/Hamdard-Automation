import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import ClientBody from "./client-body";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "University Portal",
  description: "University Portal for managing projects, files, and administration.",
  keywords: ["University", "FYP", "Portal", "Administration"],
  authors: [{ name: "University" }],
  icons: {
    icon: '/hamdardfavicon.png',
    shortcut: '/hamdardfavicon.png',
    apple: '/hamdardfavicon.png',
  },
  openGraph: {
    title: "University Portal",
    description: "Portal to manage student FYPs, committees, and administrative tasks",
    url: "https://example.university",
    siteName: "University Portal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "University Portal",
    description: "Portal to manage student FYPs, committees, and administrative tasks",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
   <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // NUCLEAR OPTION: Remove "N" icon immediately and continuously
                function killNIcon() {
                  try {
                    // Method 1: Remove ONLY Next.js dev tools elements (specific selectors)
                    try {
                      // Remove from main DOM
                      const devToolsElements = document.querySelectorAll('[data-nextjs-dev-tools-button], [data-next-badge], #next-logo');
                      for (let i = 0; i < devToolsElements.length; i++) {
                        devToolsElements[i].style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                        try { devToolsElements[i].remove(); } catch(e) {}
                      }
                    } catch(e) {}
                    
                    // Method 2: Access Shadow DOM and remove Next.js dev tools
                    try {
                      // Find nextjs-portal elements (they contain shadow DOM)
                      const scripts = document.querySelectorAll('script');
                      for (let i = 0; i < scripts.length; i++) {
                        try {
                          const nextjsPortal = scripts[i].querySelector('nextjs-portal');
                          if (nextjsPortal && nextjsPortal.shadowRoot) {
                            // Remove devtools indicator from shadow DOM
                            const devtoolsIndicator = nextjsPortal.shadowRoot.querySelector('#devtools-indicator');
                            if (devtoolsIndicator) {
                              devtoolsIndicator.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { devtoolsIndicator.remove(); } catch(e) {}
                            }
                            
                            // Remove next-logo button
                            const nextLogo = nextjsPortal.shadowRoot.querySelector('#next-logo');
                            if (nextLogo) {
                              nextLogo.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { nextLogo.remove(); } catch(e) {}
                            }
                            
                            // Remove data-next-badge elements
                            const badges = nextjsPortal.shadowRoot.querySelectorAll('[data-next-badge]');
                            for (let j = 0; j < badges.length; j++) {
                              badges[j].style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { badges[j].remove(); } catch(e) {}
                            }
                            
                            // Remove dev tools button
                            const devToolsButton = nextjsPortal.shadowRoot.querySelector('[data-nextjs-dev-tools-button]');
                            if (devToolsButton) {
                              devToolsButton.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { devToolsButton.remove(); } catch(e) {}
                            }
                            
                            // Remove all panels
                            const panels = nextjsPortal.shadowRoot.querySelectorAll('[id^="panel-"]');
                            for (let j = 0; j < panels.length; j++) {
                              panels[j].style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { panels[j].remove(); } catch(e) {}
                            }
                          }
                        } catch(e) {}
                      }
                      
                      // Also try direct query
                      const portals = document.querySelectorAll('nextjs-portal');
                      for (let i = 0; i < portals.length; i++) {
                        try {
                          if (portals[i].shadowRoot) {
                            const devtoolsIndicator = portals[i].shadowRoot.querySelector('#devtools-indicator');
                            if (devtoolsIndicator) {
                              devtoolsIndicator.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { devtoolsIndicator.remove(); } catch(e) {}
                            }
                            const nextLogo = portals[i].shadowRoot.querySelector('#next-logo');
                            if (nextLogo) {
                              nextLogo.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { nextLogo.remove(); } catch(e) {}
                            }
                            const badges = portals[i].shadowRoot.querySelectorAll('[data-next-badge]');
                            for (let j = 0; j < badges.length; j++) {
                              badges[j].style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                              try { badges[j].remove(); } catch(e) {}
                            }
                          }
                        } catch(e) {}
                      }
                    } catch(e) {}
                    
                    // Method 3: Remove Next.js dev tools from main DOM (already done in Method 1, but keep for safety)
                  } catch(e) {}
                }
                
                // Run IMMEDIATELY before anything else
                killNIcon();
                
                // Run on DOM ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', killNIcon);
                }
                
                // Run continuously - EXTREMELY FAST
                setInterval(killNIcon, 5);
                setInterval(killNIcon, 10);
                setInterval(killNIcon, 50);
                setInterval(killNIcon, 100);
                
                // Use requestAnimationFrame for frame-by-frame (60fps)
                function rafKill() {
                  killNIcon();
                  requestAnimationFrame(rafKill);
                }
                rafKill();
                
                // Watch for new elements - observe entire document
                if (window.MutationObserver) {
                  new MutationObserver(function() {
                    killNIcon();
                  }).observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <ClientBody>
        {children}
        <Toaster />
      </ClientBody>
    </html>
  );
}
