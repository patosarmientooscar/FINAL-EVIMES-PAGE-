/* ==========================================================================
   Planes. EDITABLE. De aquí salen las cards de la home, las de planes.html y
   la tabla comparativa.
   · incluye: lo PROPIO de cada plan (es lo que enseñan las cards).
   · hereda + quita: la tabla es acumulativa. Inmersión tiene todo lo de
     Fundamento menos "Landing de una página"; Impacto, todo lo de Inmersión.
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
    para: 'Una landing para conseguir clientes.',
    incluye: ['Landing de una página', 'Con tu marca y tus colores', 'Formulario y botón de WhatsApp', 'Adaptada a móvil', 'Dominio y SSL'],
    boton: 'Empezar'
  },
  {
    id: 'inmersion',
    nombre: 'Inmersión',
    precio: '499 €',
    para: 'Para destacar y captar clientes.',
    incluye: ['Todas las páginas que necesites', 'Diseño web a medida', 'Animaciones y experiencia inmersiva', 'Pensada para convertir', 'SEO completo'],
    hereda: 'fundamento',
    quita: ['Landing de una página'],
    boton: 'Empezar',
    recomendado: true
  },
  {
    id: 'impacto',
    nombre: 'Impacto',
    precio: 'A medida',
    para: 'Lo que nunca se ha hecho.',
    incluye: ['Concepto creado desde cero', 'Nuestro trabajo más creativo', 'UX y animaciones avanzadas', 'Tienda online, SEO, AEO y GEO si lo necesitas'],
    hereda: 'inmersion',
    unica: 'Una web única, diseñada desde cero solo para tu marca. No existe otra igual.',
    boton: 'Pide presupuesto'
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
