/* ==========================================================================
   header.js — cabecera fija: sala actual, sonido y Plano (navegación).
   ========================================================================== */
(function () {
  var EV = (window.EV = window.EV || {});

  EV.sound = { on: false };

  EV.header = {
    init: function () {
      var roomLabel = document.querySelector('[data-room]');
      var soundBtn = document.querySelector('.btn-sound');
      var planBtn = document.querySelector('.btn-plan');
      var dialog = document.getElementById('plano');
      var closeBtn = dialog.querySelector('.plan__close');
      var drawing = dialog.querySelector('.plan__drawing');
      var listLinks = dialog.querySelectorAll('.plan__list a');
      var rooms = dialog.querySelectorAll('.room');
      var here = dialog.querySelector('.here-g');
      var anim = null;

      /* — Sala actual — */
      function onZone(id, label) {
        roomLabel.textContent = label;
        listLinks.forEach(function (a) {
          var on = a.dataset.goto === id;
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
          var note = a.querySelector('.plan__note');
          note.textContent = on ? 'Estás aquí' : note.dataset.note;
        });
        var g = dialog.querySelector('.room[data-goto="' + id + '"]');
        if (g && here) here.style.transform = 'translate(' + g.dataset.cx + 'px,' + (+g.dataset.cy + 34) + 'px)';
      }
      document.addEventListener('ev:zone', function (e) { onZone(e.detail.id, e.detail.label); });
      var cur = EV.zones.get(EV.zones.active());
      if (cur) onZone(cur.cfg.id, cur.cfg.label);

      /* — Sonido (apagado por defecto; el audio llegará en otra fase) — */
      soundBtn.addEventListener('click', function () {
        EV.sound.on = !EV.sound.on;
        soundBtn.setAttribute('aria-pressed', String(EV.sound.on));
        soundBtn.setAttribute('aria-label', EV.sound.on ? 'Silenciar sonido' : 'Activar sonido');
        document.dispatchEvent(new CustomEvent('ev:sound', { detail: { on: EV.sound.on } }));
      });

      /* — Plano — */
      var reduce = EV.reducedMotion;
      function open() {
        if (dialog.open) return;
        EV.scroll.stop();
        dialog.showModal();
        planBtn.setAttribute('aria-expanded', 'true');
        if (anim) anim.kill();
        if (reduce) { gsap.set([dialog, drawing], { clearProps: 'clipPath,opacity' }); return; }
        anim = gsap.timeline()
          .fromTo(dialog, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'expo.out' })
          // el plano "se traza" de izquierda a derecha
          .fromTo(drawing, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' }, 0.12)
          .fromTo(dialog.querySelectorAll('.plan__list li'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04 }, 0.25);
      }
      function close(after) {
        if (!dialog.open) return;
        var finish = function () {
          dialog.close();
          planBtn.setAttribute('aria-expanded', 'false');
          EV.scroll.start();
          if (after) after();
        };
        if (anim) anim.kill();
        if (reduce) return finish();
        anim = gsap.to(dialog, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.45, ease: 'power3.in', onComplete: finish });
      }

      planBtn.addEventListener('click', open);
      closeBtn.addEventListener('click', function () { close(); });
      dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });

      function go(id) {
        // El salto arranca con la cortina; el plano se cierra detrás de ella.
        EV.zones.goTo(id, function () {
          if (dialog.open) { dialog.close(); planBtn.setAttribute('aria-expanded', 'false'); EV.scroll.start(); }
          planBtn.focus({ preventScroll: true });
        });
        if (EV.mode !== 'cine') close();
      }

      listLinks.forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); go(a.dataset.goto); });
        a.addEventListener('mouseenter', function () { hover(a.dataset.goto, true); });
        a.addEventListener('mouseleave', function () { hover(a.dataset.goto, false); });
        a.addEventListener('focus', function () { hover(a.dataset.goto, true); });
        a.addEventListener('blur', function () { hover(a.dataset.goto, false); });
      });
      rooms.forEach(function (g) {
        g.addEventListener('click', function () { go(g.dataset.goto); });
        g.addEventListener('mouseenter', function () { hover(g.dataset.goto, true); });
        g.addEventListener('mouseleave', function () { hover(g.dataset.goto, false); });
      });
      function hover(id, on) {
        dialog.querySelectorAll('[data-goto="' + id + '"]').forEach(function (el) { el.classList.toggle('is-hover', on); });
      }
    }
  };
})();
