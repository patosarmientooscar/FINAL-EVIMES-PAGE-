/* Zona 03 — Diseño Web. Sala de cristal I.
   Incluye una pantalla de prueba para validar screenQuad sobre el placeholder:
   el canvas dibuja un monitor que gira con la cámara y la capa HTML se coloca
   encima interpolando keyframes cada 10 fotogramas. Cuando lleguen los
   fotogramas reales, los keyframes vendrán del tracking de la pantalla. */
(function () {
  var EV = window.EV;
  var ID = 'diseno-web';

  // Esquinas de la pantalla (px de imagen) para un t 0–1 de la zona.
  function monitor(t, iw, ih) {
    var portrait = ih > iw;
    var yaw = 0.55 - 0.8 * t;
    var base = iw * (portrait ? 0.52 + 0.3 * t : 0.2 + 0.2 * t);
    var H = base * 0.625;
    var W = base * Math.cos(yaw);
    var cx = iw * (portrait ? 0.52 : 0.64 - 0.1 * t);
    var cy = ih * (portrait ? 0.44 : 0.46);
    var k = 0.3 * Math.sin(yaw);
    var hl = H * (1 + k), hr = H * (1 - k);
    return [[cx - W / 2, cy - hl / 2], [cx + W / 2, cy - hr / 2], [cx + W / 2, cy + hr / 2], [cx - W / 2, cy + hl / 2]];
  }
  var T0 = 0.12, T1 = 0.92;

  function keyframes(variant) {
    var cfg = EV.manifest.zones.filter(function (z) { return z.id === ID; })[0];
    var v = EV.manifest.variants[variant];
    var n = cfg.frames, out = [];
    var f0 = Math.ceil(T0 * (n - 1)), f1 = Math.floor(T1 * (n - 1));
    for (var f = f0; f <= f1; f += 10) push(f);
    if (out[out.length - 1].f !== f1) push(f1);
    function push(f) {
      var c = monitor(f / (n - 1), v.w, v.h).map(function (p) { return [p[0] / v.w, p[1] / v.h]; });
      out.push({ f: f, c: c });
    }
    return out;
  }

  EV.zoneScripts[ID] = {
    init: function (zone) {
      if (EV.mode !== 'cine') return;
      var el = zone.stage.querySelector('.quad-test');
      if (el) EV.overlay.screenQuad(el, { zone: ID, keyframes: { desktop: keyframes('desktop'), mobile: keyframes('mobile') } });
    },
    placeholder: function (ctx, t, frame, iw, ih) {
      if (t < T0 || t > T1) return;
      var q = monitor(t, iw, ih);
      var cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
      var bez = q.map(function (p) { return [cx + (p[0] - cx) * 1.06, cy + (p[1] - cy) * 1.09]; });
      ctx.fillStyle = '#2b2e35';
      poly(ctx, bez); ctx.fill();
      ctx.fillStyle = '#05070d';
      poly(ctx, q); ctx.fill();
      ctx.strokeStyle = 'rgba(233,227,216,0.5)';
      poly(ctx, q); ctx.stroke();
    }
  };
  function poly(ctx, q) { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (var i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); }

  EV.room(ID, 'disenoWeb', {
    main: { x: '8%', y: '22%', xm: '6%', ym: '62%' },
    items: [
      { x: '22%', y: '64%', xm: '6%', ym: '68%' },
      { x: '78%', y: '30%', side: 'left', xm: '94%', ym: '18%' },
      { x: '14%', y: '40%', xm: '6%', ym: '76%' },
      { x: '84%', y: '70%', side: 'left', xm: '94%', ym: '84%' }
    ]
  });
})();
