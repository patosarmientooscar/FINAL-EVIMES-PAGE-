/* Zona 01 — Fachada. La cámara se acerca al edificio y entra por la ventana. */
(function () {
  var EV = window.EV;
  EV.zoneScripts['fachada'] = {
    init: function (zone) {
      var copy = zone.stage.querySelector('.fachada__copy');
      if (EV.mode !== 'cine') return;
      EV.zones.on('fachada', function (p) {
        // Visible al llegar; se retira cuando la cámara empieza a acercarse.
        var o = 1 - EV.util.range(p, 0.16, 0.34);
        copy.style.opacity = o.toFixed(3);
        copy.style.transform = 'translate3d(0,' + (-EV.util.range(p, 0.1, 0.34) * 4).toFixed(2) + 'vh,0)';
      });
    }
  };
})();
