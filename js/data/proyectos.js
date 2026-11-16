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
   Trabajo selecto (home nueva, panel gris). EDITABLE.
   Un proyecto sin url o sin media NO se muestra (salvo `destacado` con
   `placeholder: true`, que enseña un hueco limpio hasta que llegue el vídeo).
   media: { video: [webm, mp4], poster } · estado: 'online' | 'horno' (coming soon).
   Los proyectos marcados borrador: true solo se ven con ?borradores=1 (para
   revisar el diseño) hasta que Oscar los rellene.
   ========================================================================== */
window.EVIMES_TRABAJO = [
  {
    id: 'disco',
    nombre: 'Disco',
    tipo: 'Web 3D · WebGL',
    nota: 'Cámaras, flashes y una pista que se mueve contigo.',      // BORRADOR
    url: '',                                                         // PENDIENTE: URL de la web 3D
    media: { video: ['assets/proyectos/disco/disco.webm', 'assets/proyectos/disco/disco.mp4'], poster: 'assets/proyectos/disco/disco-poster.webp' },
    destacado: true,
    placeholder: true                                                 // PENDIENTE: vídeo + póster en assets/proyectos/disco/
  },
  {
    id: 'discoproduccion',
    nombre: 'Disco Producción',
    tipo: 'Web en HTML',
    nota: 'Productora audiovisual en Madrid.',
    url: 'https://discoproduccion.com/',
    media: {
      video: ['assets/proyectos/discoproduccion/discoproduccion-scroll.webm', 'assets/proyectos/discoproduccion/discoproduccion-scroll.mp4'],
      poster: 'assets/proyectos/discoproduccion/discoproduccion-poster.webp'
    },
    estado: 'online'
  },
  {
    id: 'barberia',
    nombre: 'Barbería',                                               // BORRADOR: nombre real
    tipo: 'Web para barbería',
    url: '',                                                         // BORRADOR
    media: null,                                                     // BORRADOR
    acabado: 'laton',
    borrador: true
  },
  { id: 'horno-1', nombre: '', fecha: '', estado: 'horno', borrador: true },   // BORRADOR: nombre + fecha aproximada
  { id: 'horno-2', nombre: '', fecha: '', estado: 'horno', borrador: true }    // BORRADOR
];
