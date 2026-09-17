/**
 * main.js
 * Punto de entrada. Divide la inicialización en dos capas:
 *  - initGlobal(): todo lo que vive fuera de <main> (header, cursor, Lenis)
 *    y que solo debe correr una vez, al cargar el documento.
 *  - initPageAnimations(): todo lo que depende del contenido de <main>
 *    (scroll reveal, filtros, drag-scroll, botones magnéticos). Se vuelve
 *    a ejecutar después de cada transición pjax porque el <main> se
 *    reemplaza por completo.
 */

(function () {
  let lenis = null;

  /* ------------------------------------------------------------------ */
  /* Lenis — scroll suave e inercial                                     */
  /* ------------------------------------------------------------------ */
  function initLenis() {
    if (typeof Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', () => {
      if (window.ScrollTrigger) ScrollTrigger.update();
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    window.PortfolioLenis = {
      scrollTo: (target, opts) => lenis.scrollTo(target, opts),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Cursor personalizado                                                 */
  /* ------------------------------------------------------------------ */
  function initCursor() {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isFinePointer) return;

    const cursor = document.querySelector('.cursor');
    if (!cursor || typeof gsap === 'undefined') return;

    document.body.classList.add('has-custom-cursor');

    window.addEventListener('mousemove', (e) => {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.3, ease: 'power2.out' });
    });

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('a, button, .cursor-hover');
      if (!target) return;
      cursor.classList.add('cursor--hover');
      cursor.dataset.cursorText = target.dataset.cursorText || (target.matches('a') ? 'Ver' : '');
    });
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('a, button, .cursor-hover');
      if (!target) return;
      cursor.classList.remove('cursor--hover');
      cursor.dataset.cursorText = '';
    });
  }

  /* ------------------------------------------------------------------ */
  /* Header: estado "scrolled" + submenús + toggle móvil                 */
  /* ------------------------------------------------------------------ */
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Submenús: mouseenter/mouseleave con animación GSAP fade + slide-down
    document.querySelectorAll('.nav__item').forEach((item) => {
      const submenu = item.querySelector('.submenu');
      if (!submenu) return;

      const open = () => {
        item.classList.add('is-open');
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(
            submenu,
            { opacity: 0, y: -8 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
          );
        }
      };
      const close = () => {
        item.classList.remove('is-open');
        if (typeof gsap !== 'undefined') {
          gsap.to(submenu, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.out' });
        }
      };

      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', close);

      // Accesibilidad / móvil: click en el link con caret alterna el submenú
      const link = item.querySelector('.nav__link');
      if (link) {
        link.addEventListener('click', (e) => {
          if (window.innerWidth > 720) return;
          if (item.classList.contains('is-open')) return; // deja navegar si ya está abierto
          e.preventDefault();
          open();
        });
      }
    });

    // Menú móvil (hamburguesa)
    const toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
      });
    }
    // Cierra el menú móvil al navegar
    document.querySelectorAll('.nav__link, .submenu__link').forEach((link) => {
      link.addEventListener('click', () => document.body.classList.remove('nav-open'));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Botones magnéticos                                                   */
  /* ------------------------------------------------------------------ */
  function initMagneticButtons() {
    if (typeof gsap === 'undefined') return;
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      if (btn.dataset.magneticInit) return;
      btn.dataset.magneticInit = 'true';

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const offsetX = e.clientX - (rect.left + rect.width / 2);
        const offsetY = e.clientY - (rect.top + rect.height / 2);
        gsap.to(btn, { x: offsetX * 0.3, y: offsetY * 0.3, duration: 0.3, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                        */
  /* ------------------------------------------------------------------ */
  function initScrollReveal() {
    if (typeof gsap === 'undefined' || !window.ScrollTrigger) return;

    // Limpia triggers de la página anterior (evita fugas al reemplazar <main>)
    ScrollTrigger.getAll().forEach((t) => t.kill());

    document.querySelectorAll('.reveal').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
          },
        }
      );
    });

    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------ */
  /* Filtros de trabajo (página Work)                                     */
  /* ------------------------------------------------------------------ */
  function initWorkFilters() {
    const filterBar = document.querySelector('[data-filters]');
    if (!filterBar) return;

    const pills = filterBar.querySelectorAll('.filter-pill');
    const cards = document.querySelectorAll('[data-category]');

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const category = pill.dataset.filter;
        pills.forEach((p) => p.classList.toggle('is-active', p === pill));

        const matching = [];
        const notMatching = [];
        cards.forEach((card) => {
          const isMatch = category === 'all' || card.dataset.category === category;
          (isMatch ? matching : notMatching).push(card);
        });

        if (typeof gsap === 'undefined') {
          cards.forEach((c) => {
            c.style.display = matching.includes(c) ? '' : 'none';
          });
          return;
        }

        gsap.to(notMatching, {
          opacity: 0,
          duration: 0.25,
          ease: 'power1.out',
          onComplete: () => {
            notMatching.forEach((c) => (c.style.display = 'none'));
            matching.forEach((c) => (c.style.display = ''));
            gsap.fromTo(
              matching,
              { opacity: 0 },
              { opacity: 1, duration: 0.35, ease: 'power1.out', stagger: 0.04 }
            );
          },
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Reinicialización tras cada transición de página                     */
  /* ------------------------------------------------------------------ */
  function initPageAnimations() {
    document.documentElement.classList.add('js-ready');
    initScrollReveal();
    initMagneticButtons();
    initWorkFilters();
    if (window.PortfolioDragScroll) window.PortfolioDragScroll.initAll();
  }

  function initGlobal() {
    initLenis();
    initCursor();
    initHeader();
    if (window.PortfolioTransitions) window.PortfolioTransitions.init();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initGlobal();
    initPageAnimations();
  });

  window.PortfolioMain = { initPageAnimations };
})();
