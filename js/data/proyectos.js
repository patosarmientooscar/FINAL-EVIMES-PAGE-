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

/* --------------------------------------------------------------------------
   proyectos.html: los dos ejemplos, uno por tipo de cliente. EDITABLE.
   - url:   la web publicada. null = sin enlace.
   - video: el recorrido por la web (16:10, sin audio), comprimido con
            tools/video.sh → { mp4, webm, poster }. null = la captura (Disco)
            o la card de espera (León's).
   -------------------------------------------------------------------------- */
window.EVIMES_PROYECTOS.casos = {
  disco: {
    nombre: 'Disco Producción',
    url: 'https://discoproduccion.com',
    video: null    // { mp4: 'assets/proyectos/disco-recorrido.mp4', webm: 'assets/proyectos/disco-recorrido.webm', poster: 'assets/proyectos/disco-recorrido.jpg' }
  },
  leons: {
    nombre: "León's",
    url: null,     // PENDIENTE: la URL de la web de León's
    video: null    // { mp4: 'assets/proyectos/leons-recorrido.mp4', webm: 'assets/proyectos/leons-recorrido.webm', poster: 'assets/proyectos/leons-recorrido.jpg' }
  }
};
