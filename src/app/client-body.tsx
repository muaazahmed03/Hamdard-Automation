'use client';

import { useEffect } from 'react';
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Add inline style to head for early hiding (runs before React hydration)
    const hideStyle = document.createElement('style');
    hideStyle.textContent = `
      /* Only hide Next.js dev tools - don't affect other elements */
    `;
    if (document.head) {
      document.head.appendChild(hideStyle);
    }
    
    // Add inline script to head for early removal (runs before React hydration)
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        function removeNIcon() {
          try {
            // Method 1: Remove by common selectors (including Next.js dev indicators)
            const selectors = [
              '[class*="dev-tool"]',
              '[class*="devtool"]',
              '[data-dev-tool]',
              '[data-overlay]',
              '[class*="overlay"]',
              '[id*="__next"]',
              '[class*="__next"]',
              '[class*="nextjs"]',
              '[class*="next-dev"]',
              '[data-nextjs]'
            ];
            selectors.forEach(s => {
              try {
                document.querySelectorAll(s).forEach(el => el.remove());
              } catch(e) {}
            });
            
            // Method 2: Remove ONLY Next.js dev tools elements from main DOM (specific selectors only)
            try {
              const devToolsElements = document.querySelectorAll('[data-nextjs-dev-tools-button], [data-next-badge], #next-logo');
              for (let i = 0; i < devToolsElements.length; i++) {
                devToolsElements[i].style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                try { devToolsElements[i].remove(); } catch(e) {}
              }
            } catch(e) {}
            
            // Method 3: Access Shadow DOM and remove Next.js dev tools
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
                  }
                } catch(e) {}
              }
              
              // Also try direct query for nextjs-portal
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
            
            // Method 4: Already handled in Method 2
          } catch(e) {
            // Silently fail
          }
        }
        
        // Run immediately
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', removeNIcon);
        } else {
          removeNIcon();
        }
        
        // Run continuously with multiple intervals for better coverage (more frequent)
        const interval1 = setInterval(removeNIcon, 50);
        const interval2 = setInterval(removeNIcon, 100);
        const interval3 = setInterval(removeNIcon, 500);
        const interval4 = setInterval(removeNIcon, 2000);
        
        // Use requestAnimationFrame for frame-by-frame checking (most aggressive)
        let rafId;
        function checkFrame() {
          removeNIcon();
          rafId = requestAnimationFrame(checkFrame);
        }
        rafId = requestAnimationFrame(checkFrame);
        
        // Also observe DOM changes
        if (window.MutationObserver) {
          const observer = new MutationObserver(() => {
            removeNIcon();
          });
          
          if (document.body) {
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['style', 'class', 'id']
            });
          } else {
            document.addEventListener('DOMContentLoaded', () => {
              if (document.body) {
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['style', 'class', 'id']
                });
              }
            });
          }
        }
        
        // Store cleanup function
        (window as any).__removeNIconCleanup = function() {
          clearInterval(interval1);
          clearInterval(interval2);
          clearInterval(interval3);
          clearInterval(interval4);
          if (rafId) cancelAnimationFrame(rafId);
        };
      })();
    `;
    
    // Insert script as early as possible
    if (document.head) {
      document.head.insertBefore(script, document.head.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.head) {
          document.head.insertBefore(script, document.head.firstChild);
        }
      });
    }
    
    return () => {
      if (script.parentNode) {
        script.remove();
      }
      if (hideStyle.parentNode) {
        hideStyle.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Remove any attributes added by browser extensions that might cause hydration issues
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'cz-shortcut-listen') {
          const body = document.body;
          if (body.hasAttribute('cz-shortcut-listen')) {
            body.removeAttribute('cz-shortcut-listen');
          }
        }
        
        // Remove unwanted dev tool overlay elements
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              // Check for dev tool elements by various attributes
              // Safely get className as string (handles both string and DOMTokenList)
              const className = element.className 
                ? (typeof element.className === 'string' ? element.className : String(element.className))
                : '';
              if (
                element.hasAttribute('data-dev-tool') ||
                element.hasAttribute('data-overlay') ||
                (className && (className.includes('dev-tool') || className.includes('devtool') || className.includes('overlay'))) ||
                element.id?.includes('dev-tool') ||
                element.id?.includes('devtool') ||
                element.id?.includes('overlay') ||
                // Check for elements with "N" text content (the icon)
                (element.textContent?.trim() === 'N' && element.style.position === 'fixed') ||
                // Check for circular black elements with white "N"
                (element.querySelector && element.querySelector('*')?.textContent?.trim() === 'N' && 
                 window.getComputedStyle(element).backgroundColor.includes('rgb(0, 0, 0)') || 
                 window.getComputedStyle(element).backgroundColor.includes('black'))
              ) {
                element.remove();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['cz-shortcut-listen']
    });

    // Comprehensive function to remove ONLY Next.js dev tools
    const removeNIconElements = () => {
      try {
        // Method 1: Remove ONLY Next.js dev tools from main DOM (specific selectors)
        try {
          const devToolsElements = document.querySelectorAll('[data-nextjs-dev-tools-button], [data-next-badge], #next-logo');
          for (let i = 0; i < devToolsElements.length; i++) {
            const el = devToolsElements[i] as HTMLElement;
            if (el) {
              el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
              try { el.remove(); } catch(e) {}
            }
          }
        } catch(e) {}

        // Method 2: Access Shadow DOM and remove Next.js dev tools
        try {
          // Find nextjs-portal elements (they contain shadow DOM)
          const scripts = document.querySelectorAll('script');
          for (let i = 0; i < scripts.length; i++) {
            try {
              const nextjsPortal = scripts[i].querySelector('nextjs-portal') as HTMLElement & { shadowRoot: ShadowRoot | null };
              if (nextjsPortal && nextjsPortal.shadowRoot) {
                // Remove devtools indicator from shadow DOM
                const devtoolsIndicator = nextjsPortal.shadowRoot.querySelector('#devtools-indicator') as HTMLElement;
                if (devtoolsIndicator) {
                  devtoolsIndicator.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                  try { devtoolsIndicator.remove(); } catch(e) {}
                }
                
                // Remove next-logo button
                const nextLogo = nextjsPortal.shadowRoot.querySelector('#next-logo') as HTMLElement;
                if (nextLogo) {
                  nextLogo.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                  try { nextLogo.remove(); } catch(e) {}
                }
                
                // Remove data-next-badge elements
                const badges = nextjsPortal.shadowRoot.querySelectorAll('[data-next-badge]');
                for (let j = 0; j < badges.length; j++) {
                  const badge = badges[j] as HTMLElement;
                  if (badge) {
                    badge.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                    try { badge.remove(); } catch(e) {}
                  }
                }
                
                // Remove dev tools button
                const devToolsButton = nextjsPortal.shadowRoot.querySelector('[data-nextjs-dev-tools-button]') as HTMLElement;
                if (devToolsButton) {
                  devToolsButton.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                  try { devToolsButton.remove(); } catch(e) {}
                }
              }
            } catch(e) {}
          }
          
          // Also try direct query for nextjs-portal
          const portals = document.querySelectorAll('nextjs-portal');
          for (let i = 0; i < portals.length; i++) {
            try {
              const portal = portals[i] as HTMLElement & { shadowRoot: ShadowRoot | null };
              if (portal && portal.shadowRoot) {
                const devtoolsIndicator = portal.shadowRoot.querySelector('#devtools-indicator') as HTMLElement;
                if (devtoolsIndicator) {
                  devtoolsIndicator.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                  try { devtoolsIndicator.remove(); } catch(e) {}
                }
                const nextLogo = portal.shadowRoot.querySelector('#next-logo') as HTMLElement;
                if (nextLogo) {
                  nextLogo.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                  try { nextLogo.remove(); } catch(e) {}
                }
                const badges = portal.shadowRoot.querySelectorAll('[data-next-badge]');
                for (let j = 0; j < badges.length; j++) {
                  const badge = badges[j] as HTMLElement;
                  if (badge) {
                    badge.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                    try { badge.remove(); } catch(e) {}
                  }
                }
              }
            } catch(e) {}
          }
        } catch(e) {}
      } catch (e) {
        // Silently fail
      }
    };

    // Remove immediately and repeatedly to catch dynamically added elements
    removeNIconElements();
    setTimeout(removeNIconElements, 50);
    setTimeout(removeNIconElements, 100);
    setTimeout(removeNIconElements, 250);
    setTimeout(removeNIconElements, 500);
    setTimeout(removeNIconElements, 1000);
    
    // Set up continuous monitoring with multiple intervals (more frequent)
    const interval1 = setInterval(removeNIconElements, 50);
    const interval2 = setInterval(removeNIconElements, 100);
    const interval3 = setInterval(removeNIconElements, 500);
    const interval4 = setInterval(removeNIconElements, 1000);
    
    // Use requestAnimationFrame for frame-by-frame checking (most aggressive)
    let rafId2;
    function checkFrame2() {
      removeNIconElements();
      rafId2 = requestAnimationFrame(checkFrame2);
    }
    rafId2 = requestAnimationFrame(checkFrame2);

    return () => {
      observer.disconnect();
      clearInterval(interval1);
      clearInterval(interval2);
      clearInterval(interval3);
      clearInterval(interval4);
      if (rafId2) cancelAnimationFrame(rafId2);
      if ((window as any).__removeNIconCleanup) {
        (window as any).__removeNIconCleanup();
      }
    };
  }, []);

  return (
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      suppressHydrationWarning
    >
      {children}
    </body>
  );
}