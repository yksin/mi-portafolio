/**
 * transitions.js
 * Transiciones de página estilo "pjax" sin frameworks:
 *  1. Se intercepta el click en enlaces internos marcados con [data-transition].
 *  2. Un overlay a pantalla completa sube (GSAP) cubriendo el viewport.
 *  3. Con la pantalla cubierta, se hace fetch() del HTML destino, se extrae
 *     su <main> con DOMParser y se reemplaza el <main> actual (evita FOUC
 *     porque el swap ocurre completamente oculto tras el overlay).
 *  4. Se actualiza la URL con history.pushState y el <title>.
 *  5. El overlay se retira hacia arriba y el contenido nuevo entra con
 *     un stagger sutil.
 *  6. Se reinicializan scripts dependientes del DOM (scroll reveal,
 *     drag-scroll, cursor, nav activo, ScrollTrigger).
 *
 * El <header> vive fuera de <main> a propósito: nunca se re-renderiza.
 *
 * Fallback: si `fetch` falla (por ejemplo al abrir el sitio con file://,
 * donde el navegador bloquea fetch de otros archivos locales por CORS) o
 * el navegador no soporta las APIs necesarias, se hace una navegación
 * normal (`location.href`) sin romper la experiencia.
 */

(function () {
  const OVERLAY_SELECTOR = '.page-transition-overlay';
  const MAIN_SELECTOR = 'main';
  let isTransitioning = false;

  function supportsPjax() {
    return (
      typeof window.fetch === 'function' &&
      typeof window.DOMParser === 'function' &&
      typeof window.history.pushState === 'function' &&
      typeof window.gsap !== 'undefined'
    );
  }

  function getOverlay() {
    return document.querySelector(OVERLAY_SELECTOR);
  }

  async function fetchPage(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Fetch de página falló: ' + res.status);
    const html = await res.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function setActiveNavLink(pathname) {
    document.querySelectorAll('.nav__link[data-nav-path]').forEach((link) => {
      const isActive = link.dataset.navPath === pathname;
      link.classList.toggle('is-active', isActive);
    });
  }

  /**
   * Ejecuta la transición completa hacia `url`.
   * @param {string} url
   * @param {{ push?: boolean }} opts push=false en navegación popstate
   */
  async function runTransition(url, opts) {
    const push = !opts || opts.push !== false;
    if (isTransitioning) return;
    isTransitioning = true;

    const overlay = getOverlay();
    const overlayLabel = overlay ? overlay.querySelector('.page-transition-overlay__label') : null;
    const main = document.querySelector(MAIN_SELECTOR);

    const tl = gsap.timeline({
      onComplete: () => { isTransitioning = false; },
    });

    tl.set(overlay, { pointerEvents: 'auto' })
      .to(overlay, {
        yPercent: 0,
        duration: 0.6,
        ease: 'power3.inOut',
      })
      .to(overlayLabel, { opacity: 1, duration: 0.25 }, '-=0.2')
      .call(async () => {
        try {
          const newDoc = await fetchPage(url);
          const newMain = newDoc.querySelector(MAIN_SELECTOR);
          if (!newMain) throw new Error('El documento destino no tiene <main>.');

          main.innerHTML = newMain.innerHTML;
          document.title = newDoc.title || document.title;

          if (push) history.pushState({ pjax: true }, '', url);
          setActiveNavLink(new URL(url, window.location.origin).pathname);

          window.scrollTo(0, 0);
          if (window.PortfolioLenis && window.PortfolioLenis.scrollTo) {
            window.PortfolioLenis.scrollTo(0, { immediate: true });
          }

          if (window.PortfolioMain && window.PortfolioMain.initPageAnimations) {
            window.PortfolioMain.initPageAnimations();
          }
        } catch (err) {
          console.warn('[transitions] Fallback a navegación normal:', err);
          window.location.href = url;
        }
      })
      .to(overlayLabel, { opacity: 0, duration: 0.2 })
      .to(overlay, {
        yPercent: -100,
        duration: 0.6,
        ease: 'power3.inOut',
      })
      .set(overlay, { pointerEvents: 'none' })
      .set(overlay, { yPercent: 100 })
      .from(
        `${MAIN_SELECTOR} > *`,
        {
          opacity: 0,
          y: 20,
          stagger: 0.08,
          duration: 0.5,
          ease: 'power2.out',
        },
        '-=0.1'
      );
  }

  function onLinkClick(e) {
    const link = e.target.closest('a[data-transition]');
    if (!link) return;

    // Deja pasar clicks especiales (nueva pestaña, descarga, ancla externa)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== '_self') return;
    if (link.origin !== window.location.origin) return;

    e.preventDefault();

    if (link.href === window.location.href) return;

    if (!supportsPjax()) {
      window.location.href = link.href;
      return;
    }

    runTransition(link.href, { push: true });
  }

  function onPopState() {
    if (!supportsPjax()) return; // el navegador ya cambió la URL/contenido por sí solo si recarga
    runTransition(window.location.href, { push: false });
  }

  function init() {
    document.addEventListener('click', onLinkClick);
    window.addEventListener('popstate', onPopState);

    // Estado inicial para que el primer "atrás" tenga de dónde partir.
    history.replaceState({ pjax: true }, '', window.location.href);
    setActiveNavLink(window.location.pathname);
  }

  window.PortfolioTransitions = { init };
})();
