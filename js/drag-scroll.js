/**
 * drag-scroll.js
 * Arrastre manual (mouse + touch) con inercia para contenedores con
 * overflow-x. No depende de scroll nativo del trackpad: calcula el delta
 * del puntero y mueve `scrollLeft` a mano, y al soltar aplica una
 * velocidad residual que se atenúa por fricción con requestAnimationFrame.
 */

(function () {
  const FRICTION = 0.95;
  const MIN_VELOCITY = 0.5;

  /**
   * Activa drag-to-scroll con inercia sobre un elemento.
   * @param {HTMLElement} el
   */
  function initDragScroll(el) {
    if (!el || el.dataset.dragScrollInit) return;
    el.dataset.dragScrollInit = 'true';

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let rafId = null;

    const stopInertia = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const runInertia = () => {
      el.scrollLeft += velocity;
      velocity *= FRICTION;
      if (Math.abs(velocity) > MIN_VELOCITY) {
        rafId = requestAnimationFrame(runInertia);
      } else {
        rafId = null;
      }
    };

    const pointerDown = (clientX) => {
      isDown = true;
      stopInertia();
      startX = clientX;
      startScrollLeft = el.scrollLeft;
      lastX = clientX;
      lastT = performance.now();
      velocity = 0;
      el.classList.add('is-dragging');
    };

    const pointerMove = (clientX) => {
      if (!isDown) return;
      const delta = clientX - startX;
      el.scrollLeft = startScrollLeft - delta;

      const now = performance.now();
      const dt = now - lastT || 16;
      velocity = -((clientX - lastX) / dt) * 16; // px por frame (~16ms)
      lastX = clientX;
      lastT = now;
    };

    const pointerUp = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('is-dragging');
      if (Math.abs(velocity) > MIN_VELOCITY) {
        rafId = requestAnimationFrame(runInertia);
      }
    };

    // --- Mouse events ---
    el.addEventListener('mousedown', (e) => {
      pointerDown(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      pointerMove(e.clientX);
    });
    window.addEventListener('mouseup', pointerUp);
    el.addEventListener('mouseleave', () => {
      if (isDown) pointerUp();
    });

    // Evita que un drag se interprete como click en los links internos
    el.addEventListener('click', (e) => {
      if (el.dataset.wasDragged === 'true') {
        e.preventDefault();
        e.stopPropagation();
        el.dataset.wasDragged = 'false';
      }
    });
    el.addEventListener('mousedown', () => { el.dataset.wasDragged = 'false'; });
    window.addEventListener('mousemove', (e) => {
      if (isDown && Math.abs(e.clientX - startX) > 6) {
        el.dataset.wasDragged = 'true';
      }
    });

    // --- Touch events ---
    el.addEventListener('touchstart', (e) => {
      pointerDown(e.touches[0].clientX);
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      pointerMove(e.touches[0].clientX);
    }, { passive: true });
    el.addEventListener('touchend', pointerUp);
    el.addEventListener('touchcancel', pointerUp);
  }

  /**
   * Busca e inicializa todos los contenedores `.drag-scroll` presentes
   * en el DOM actual. Se re-ejecuta tras cada transición de página.
   */
  function initAllDragScrollers() {
    document.querySelectorAll('.drag-scroll').forEach(initDragScroll);
  }

  window.PortfolioDragScroll = { initAll: initAllDragScrollers };
})();
