import { useEffect, useRef, type RefObject } from 'react';

interface MarqueeOptions {
  /** Vitesse de croisière, en pixels par seconde */
  speed: number;
  /** Arrêt demandé par le visiteur (bouton pause) : la bande ne bouge plus, sauf si on la tire */
  paused: boolean;
  /** Aucun mouvement (animations réduites, économie de données) : la bande se fait défiler à la main */
  disabled: boolean;
  /** Écriture de droite à gauche : la piste part de la droite et défile vers la droite */
  rtl: boolean;
}

// Temps de réponse : la bande prend sa vitesse, s'arrête ou perd l'élan d'un lancer en ~0,5 s (plus
// vite quand on la met en pause) ; elle glisse vers un lien qui reçoit le focus en ~0,1 s.
const EASE = 0.5;
const PAUSE = 0.2;
const GLIDE = 0.08;
// Élan d'un lancer, au plus (px/s)
const MAX_THROW = 2600;

/**
 * Bande qui défile sans fin, qu'on peut attraper et lancer comme un tissu qu'on tire.
 *
 * Le contenu est répété trois fois sur la piste (`track`), à l'identique ; seule la copie du milieu
 * (`copy`) est active, les deux autres sont `inert`. Le décalage reste dans un tour : la copie active
 * est toujours encadrée par ses jumelles, et le retour au début d'un tour ne se voit pas.
 *
 * - Défile vers le début de la ligne : vers la gauche, vers la droite en arabe.
 * - Ralentit jusqu'à l'arrêt sous la souris. Quand un lien reçoit le focus au clavier, la bande
 *   s'arrête et l'amène à l'écran.
 * - Se tire à la souris, au doigt ou au pavé tactile (deux doigts) ; garde son élan quand on la lâche.
 *   Le défilement vertical de la page reste libre, et le clic qui termine un glisser n'ouvre pas le lien.
 * - Suit un peu le défilement de la page : elle accélère quand on descend, recule quand on remonte.
 * - Ne calcule rien hors de l'écran ; au repos, aucune image n'est dessinée.
 */
export function useMarquee(
  viewportRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLElement | null>,
  copyRef: RefObject<HTMLElement | null>,
  { speed, paused, disabled, rtl }: MarqueeOptions,
) {
  const options = useRef({ speed, paused });
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    options.current = { speed, paused };
    wake.current();
  }, [speed, paused]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const copy = copyRef.current;
    if (disabled || !viewport || !track || !copy) {
      return;
    }

    // Position de la piste : x = sens × (un tour + décalage)
    const sign = rtl ? 1 : -1;
    let lap = copy.offsetWidth;
    let offset = 0;
    let velocity = 0;
    let visible = false;
    let hovered = false;
    let focused = false;
    let focusGoal: number | null = null;
    let suppressClick = false;
    let drag: {
      id: number;
      startX: number;
      startY: number;
      startOffset: number;
      lastX: number;
      lastTime: number;
      velocity: number;
      active: boolean;
    } | null = null;
    let frame = 0;
    let lastTime = 0;
    let lastScroll = window.scrollY;

    const wrap = (value: number) => (lap > 0 ? ((value % lap) + lap) % lap : 0);
    const cruise = () => (options.current.paused || hovered || focused || drag?.active ? 0 : options.current.speed);
    const render = () => {
      track.style.transform = `translate3d(${sign * (lap + offset)}px, 0, 0)`;
    };
    // Déplace la bande d'une distance à l'écran (vers la droite si positive)
    const moveBy = (dx: number) => {
      offset += dx * sign;
      if (!focused) {
        offset = wrap(offset);
      }
    };

    function tick(now: number) {
      frame = 0;
      if (drag?.active) {
        // Pendant un glisser, c'est le pointeur qui place la bande (onPointerMove)
        return;
      }
      // Au retour d'un onglet en arrière-plan, pas de bond
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (focusGoal !== null) {
        offset += (focusGoal - offset) * (1 - Math.exp(-dt / GLIDE));
        velocity = 0;
        if (Math.abs(focusGoal - offset) < 0.5) {
          offset = focusGoal;
          focusGoal = null;
        }
      } else {
        velocity += (cruise() - velocity) * (1 - Math.exp(-dt / (options.current.paused ? PAUSE : EASE)));
        offset += velocity * dt;
        if (!focused) {
          offset = wrap(offset);
        }
      }
      render();

      const settled = focusGoal === null && cruise() === 0 && Math.abs(velocity) < 1;
      if (settled) {
        velocity = 0;
      } else if (visible) {
        frame = requestAnimationFrame(tick);
      }
    }

    function start() {
      if (!frame && visible && !drag?.active) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }
    wake.current = start;

    // ── Survol (souris seulement) ──
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        hovered = true;
        start();
      }
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        hovered = false;
        start();
      }
    };

    // ── Tirer la bande ──
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || drag) {
        return;
      }
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offset,
        lastX: event.clientX,
        lastTime: event.timeStamp,
        velocity: 0,
        active: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      if (!drag.active) {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          // On fait défiler la page, pas la bande
          drag = null;
          return;
        }
        if (Math.abs(dx) < 6) {
          return;
        }
        drag.active = true;
        drag.startX = event.clientX;
        drag.startOffset = offset;
        drag.lastX = event.clientX;
        drag.lastTime = event.timeStamp;
        focusGoal = null;
        velocity = 0;
        viewport.setPointerCapture(event.pointerId);
        viewport.setAttribute('data-dragging', '');
      }

      offset = drag.startOffset + (event.clientX - drag.startX) * sign;
      if (!focused) {
        const wrapped = wrap(offset);
        drag.startOffset += wrapped - offset;
        offset = wrapped;
      }
      const dt = (event.timeStamp - drag.lastTime) / 1000;
      if (dt > 0) {
        drag.velocity = drag.velocity * 0.5 + (((event.clientX - drag.lastX) * sign) / dt) * 0.5;
      }
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
      render();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      if (drag.active) {
        // Le clic qui suit tout de suite le lâcher n'ouvre pas le lien
        suppressClick = true;
        window.setTimeout(() => (suppressClick = false), 0);
        // Lâchée à l'arrêt : pas d'élan
        const still = event.type === 'pointercancel' || event.timeStamp - drag.lastTime > 90;
        velocity = still ? 0 : Math.max(-MAX_THROW, Math.min(MAX_THROW, drag.velocity));
        viewport.removeAttribute('data-dragging');
      }
      drag = null;
      start();
    };

    const onClick = (event: MouseEvent) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    };

    // Pas de « fantôme » du lien quand on tire
    const onDragStart = (event: DragEvent) => event.preventDefault();

    // Pavé tactile : un geste horizontal à deux doigts fait glisser la bande (et pas la page en arrière)
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return;
      }
      event.preventDefault();
      focusGoal = null;
      moveBy(-event.deltaX);
      render();
      start();
    };

    // ── Clavier : le lien qui reçoit le focus vient à l'écran ──
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      // Un clic de souris donne aussi le focus au lien : seul le clavier arrête la bande
      if (!copy.contains(target) || !target.matches(':focus-visible')) {
        return;
      }
      focused = true;
      const frameBox = viewport.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const margin = Math.min(48, frameBox.width * 0.08);
      let shift = 0;
      if (box.left < frameBox.left + margin) {
        shift = frameBox.left + margin - box.left;
      } else if (box.right > frameBox.right - margin) {
        shift = frameBox.right - margin - box.right;
      }
      focusGoal = offset + shift * sign;
      start();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (focused && !copy.contains(event.relatedTarget as Node | null)) {
        focused = false;
        focusGoal = null;
        offset = wrap(offset);
        start();
      }
    };

    // ── Défilement de la page ──
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScroll;
      lastScroll = y;
      const base = options.current.speed;
      if (!visible || cruise() === 0) {
        return;
      }
      velocity = Math.max(-base * 4, Math.min(base * 6, velocity + dy * 5));
      start();
    };

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        start();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibility.observe(viewport);

    const size = new ResizeObserver(() => {
      lap = copy.offsetWidth;
      if (!focused) {
        offset = wrap(offset);
      }
      render();
    });
    size.observe(copy);

    render();
    viewport.addEventListener('pointerenter', onPointerEnter);
    viewport.addEventListener('pointerleave', onPointerLeave);
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('click', onClick, true);
    viewport.addEventListener('dragstart', onDragStart);
    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('focusin', onFocusIn);
    viewport.addEventListener('focusout', onFocusOut);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      wake.current = () => {};
      visibility.disconnect();
      size.disconnect();
      viewport.removeEventListener('pointerenter', onPointerEnter);
      viewport.removeEventListener('pointerleave', onPointerLeave);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('click', onClick, true);
      viewport.removeEventListener('dragstart', onDragStart);
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('focusin', onFocusIn);
      viewport.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('scroll', onScroll);
      viewport.removeAttribute('data-dragging');
      track.style.transform = '';
    };
  }, [viewportRef, trackRef, copyRef, disabled, rtl]);
}
