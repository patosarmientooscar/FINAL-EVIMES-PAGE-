/* ==========================================================================
   Textos de proyectos.html. BORRADOR: Oscar tiene que revisarlos.
   Dos ejemplos, uno por tipo de cliente. Nada de cifras inventadas: las de
   Disco salen de js/data/pagespeed.js (PageSpeed Insights) y las de León's
   de js/data/resultados.js (vacías por ahora → "Resultados en camino").
   El reto y lo que hicimos de León's son un BORRADOR genérico de negocio
   local: hay que cambiarlos por lo que se hizo de verdad.
   ========================================================================== */
window.EVIMES_PROYECTOS_PAGINA = {
  hero: {
    titulo: 'Webs que dan que hablar.',
    texto: 'Dos ejemplos, uno por cada tipo de cliente con el que trabajamos. Cada web, diseñada y programada a mano.'
  },
  disco: {
    etiqueta: 'Ejemplo · Agencia creativa',
    nombre: 'Disco Producción',
    cliente: 'Disco, productora audiovisual de foto, vídeo y edición en Madrid.',
    servicios: ['Desarrollo web', 'Animaciones 3D', 'Posicionamiento'],
    reto: 'Una web tan creativa como lo que producen, que transmita ritmo y energía.',
    hicimos: [
      'Una intro de carga con el flash de una cámara.',
      'Un hero con un fluido que reacciona al ratón.',
      'Un destello 3D que recorre la web.',
      'Y por debajo, una web rápida y accesible.'
    ]
  },
  leons: {
    etiqueta: 'Ejemplo · Negocio local',
    nombre: "León's",
    cliente: 'Negocio local.',
    servicios: ['Desarrollo web', 'Posicionamiento'],
    reto: 'Que la gente de la zona lo encuentre en Google y pase de mirar a comprar desde el móvil.',
    hicimos: [
      'Una web a medida, rápida en el móvil.',
      'Su ficha de Google al día, con la web enlazada.',
      'Un camino corto hasta el pedido o la visita.'
    ],
    espera: 'Vídeo de la web en camino',
    resultadosEspera: 'Resultados en camino',
    resultadosTexto: 'Los publicaremos cuando estén medidos.'
  },
  horno: [
    { nombre: "LOU's Visuales", estado: 'Coming soon' },
    { nombre: 'Apex Garage', estado: 'Coming soon' }   // nombre provisional (proyecto de coches)
  ],
  fin: {
    titulo: '¿El siguiente eres tú?',
    texto: 'Cuéntanos qué necesitas y te preparamos una propuesta.',
    cta: 'Pide tu propuesta'
  }
};
