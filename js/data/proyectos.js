/* ==========================================================================
   Proyectos. EDITABLE.
   - captura:   imagen 1440×900 de la web (assets/proyectos/).
   - larga:     tira vertical para el hover (varias pantallas apiladas).
   - pagespeed: puntuación de rendimiento (Lighthouse móvil). Solo valores
                REALES medidos; sin valor → no se muestra la píldora.
   - carga:     tiempo de carga (LCP móvil) en segundos, medido.
   - informe:   captura del informe PageSpeed/Lighthouse.
   - proximamente: tarjeta gris "Próximamente" (sin datos inventados).
   El orden es el de la fila del monitor; el índice `central` va al centro del arco.
   ========================================================================== */
window.EVIMES_PROYECTOS = {
  central: 2,
  lista: [
    { id: 'p2', proximamente: true },
    { id: 'p3', proximamente: true },
    {
      id: 'disco',
      cliente: 'Disco Producción',
      sector: 'Productora audiovisual',
      ciudad: 'Madrid',
      url: 'https://discoproduccion.com/',
      captura: 'assets/proyectos/disco-1440.webp',
      larga: 'assets/proyectos/disco-larga.webp',
      necesidad: 'Una web con ritmo, que enseñe su trabajo en vídeo y foto y consiga que les escriban.',
      // Medición: assets/proyectos/disco-lighthouse-movil.report.json (Lighthouse 13, móvil simulado).
      pagespeed: null,      // se rellena desde js/data/mediciones.js
      carga: null,
      informe: 'assets/proyectos/disco-pagespeed.webp'
    },
    { id: 'p4', proximamente: true },
    { id: 'p5', proximamente: true }
  ]
};

/* ==========================================================================
   La oficina (home, panel gris → #oficina-slot): las 4 cards que salen del
   monitor. Las lee js/oficina/config.js. EDITABLE.
   · Solo proyectos reales. Sin cifras.
   · soon:true = "Próximo proyecto · En el horno" (sin enlace). hue: 0 | 1, el
     degradado de su cristal esmerilado.
   · img: captura de la web (assets/proyectos/), 1280×800.
   ========================================================================== */
window.EVIMES_TRABAJO = [
  { title: 'Disco Producción', sub: 'Productora audiovisual · Madrid', img: 'assets/proyectos/discoproduccion.jpg', url: 'https://discoproduccion.com' },
  { title: 'Amad Peña Barbershop', sub: 'Barbería · Peñagrande, Madrid', img: 'assets/proyectos/amad-pena-barbershop.jpg', url: 'https://patosarmientooscar.github.io/Pelqueria-A-M/' },
  // BORRADOR: se cambiarán por proyectos reales.
  { title: 'Próximo proyecto', sub: 'En el horno', soon: true, hue: 0, borrador: true },
  { title: 'Próximo proyecto', sub: 'En el horno', soon: true, hue: 1, borrador: true }
];
