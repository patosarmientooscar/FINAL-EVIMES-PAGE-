/* ==========================================================================
   "Con quién trabajamos" (última sección del panel gris).
   EDITABLE. BORRADOR: textos provisionales, Oscar debe confirmarlos.
   Prototipo aprobado: Downloads/evimes-cards/con-quien.html (textos tal cual).

   lineas: las tres líneas del titular. Entre corchetes, la palabra que lleva
   el subrayado cian ("tu [sí]."). suave: true = línea en gris más suave.
   perfil: lo que el CTA marca en "Soy…" del formulario de contacto.
   lista: la lista corta de la columna derecha (una línea cada punto).
   ========================================================================== */
window.EVIMES_CLIENTES = [
  {
    id: 'agencias',
    pestana: 'Agencias creativas',
    lineas: ['Nosotros ponemos la idea.', 'La diseñamos, la programamos.', { texto: 'Solo nos falta tu [sí].', suave: true }],
    texto: 'Somos el estudio técnico de agencias creativas e innovadoras. Webs 3D, WebGL e interacción a medida, con vuestra marca y a vuestro ritmo.',
    cta: 'Hablemos de un proyecto',
    href: '#contacto',
    perfil: 'Agencia creativa',
    lista: ['Marca blanca', 'NDA antes de empezar', '3D y WebGL a medida', 'Plazos claros desde el primer día']
  },
  {
    id: 'locales',
    pestana: 'Negocios locales',
    lineas: ['Más visitas.', 'Más reservas.', 'Más [ventas].'],
    texto: 'Restaurantes, barberías y comercios de Madrid con una web que trabaja por ellos, también cuando está cerrado.',
    cta: 'Pide tu propuesta',
    href: '#contacto',
    perfil: 'Negocio local',
    lista: ['Web rápida, también en el móvil', 'Google y Maps al día', 'Reservas y WhatsApp en un clic', 'Hecha a medida, sin plantillas']
  }
];
