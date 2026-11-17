/* ==========================================================================
   Planes. EDITABLE. De aquí salen las cards de la home, las de planes.html y
   la tabla comparativa.
   BORRADOR: las listas vienen del prototipo aprobado en estilo
   (Downloads/evimes-hero) y Oscar debe confirmarlas antes de publicar.
   · incluye: lo PROPIO de cada plan (es lo que enseñan las cards).
   · hereda + quita: la tabla es acumulativa. Inmersión tiene todo lo de
     Fundamento menos "Web de una página"; Impacto, todo lo de Inmersión.
     EVIMES_PLANES_TODO(plan) devuelve la lista completa de un plan.
   · unica: una frase destacada en la card (solo la card, no la tabla).
   precio: texto tal cual se muestra ("Desde 150 €" → "desde" pequeño + cifra).
   recomendado: etiqueta en la card central.
   ========================================================================== */
window.EVIMES_PLANES = [
  {
    id: 'fundamento',
    nombre: 'Fundamento',
    precio: 'Desde 150 €',
    para: 'Para empezar con buena base.',
    incluye: ['Web de una página', 'Formulario y botón de WhatsApp', 'Adaptada a móvil', 'Dominio y SSL'],   // BORRADOR
    boton: 'Empezar',
    borrador: true
  },
  {
    id: 'inmersion',
    nombre: 'Inmersión',
    precio: '500 €',
    para: 'Para destacar y captar clientes.',
    incluye: ['Diseño web a medida', 'Animaciones y experiencia inmersiva', 'Pensada para convertir', 'SEO completo'],   // BORRADOR
    hereda: 'fundamento',
    quita: ['Web de una página'],
    boton: 'Empezar',
    recomendado: true,
    borrador: true
  },
  {
    id: 'impacto',
    nombre: 'Impacto',
    precio: 'A medida',
    para: 'Proyectos a medida.',
    incluye: ['Tienda online', 'SEO, AEO y GEO', 'UX y animaciones avanzadas', 'Lo que tu negocio necesite'],   // BORRADOR
    hereda: 'inmersion',
    unica: 'Una web única, diseñada desde cero solo para tu marca. No existe otra igual.',   // BORRADOR
    boton: 'Pide presupuesto',
    borrador: true
  }
];

// La lista completa de un plan (lo heredado, sin lo que quita, + lo propio).
window.EVIMES_PLANES_TODO = function (p) {
  var P = window.EVIMES_PLANES, base = [];
  if (p.hereda) { var padre = P.filter(function (x) { return x.id === p.hereda; })[0]; if (padre) base = window.EVIMES_PLANES_TODO(padre); }
  base = base.filter(function (x) { return (p.quita || []).indexOf(x) < 0; });
  p.incluye.forEach(function (x) { if (base.indexOf(x) < 0) base.push(x); });
  return base;
};
