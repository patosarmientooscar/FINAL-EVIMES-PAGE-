/* ==========================================================================
   Lo que sabe Farol, el agente IA del laboratorio. EDITABLE.
   Todo lo de aquí lo ha decidido Oscar. El agente NO puede decir nada que no esté
   aquí o en el contenido de la web: ni clientes, ni cifras, ni resultados, ni plazos.
   SIN datos privados (el repo es público): el email, el teléfono y las claves van en
   js/config.js y en la función serverless, nunca aquí.
   ========================================================================== */
window.EVIMES_AGENTE = {
  planes: [
    { id: 'fundamento', nombre: 'Fundamento', precio: 'Desde 150 €',
      que: 'Una landing de una página para negocios, pensada para conseguir clientes. Directa a lo que necesitan, con su marca y sus colores, formulario y botón de WhatsApp, adaptada a móvil.' },
    { id: 'inmersion', nombre: 'Inmersión', precio: '499 €',
      que: 'Una web a medida con todas las páginas que el negocio necesite, animaciones y experiencia inmersiva para destacar y captar clientes. SEO completo.' },
    { id: 'impacto', nombre: 'Impacto', precio: 'A medida',
      que: 'Nuestro trabajo más creativo, para lo que nunca se ha hecho. Una presencia online única, creada desde cero para esa marca. Puede incluir tienda online, SEO, AEO y GEO si lo necesita.' }
  ],
  todos: 'Todos los planes se personalizan a lo que necesita el cliente: su marca, sus colores y su estilo.',
  cambios: 'Antes de lanzar, los cambios no tienen límite: seguimos hasta que el cliente esté contento.',
  plazos: 'No damos plazos fijos: se confirman cuando vemos el proyecto.',
  mantenimiento: 'El mantenimiento va con cada plan, desde 20 € al mes según el cliente y el trabajo. Incluye que el dominio y el alojamiento estén cubiertos.',
  reglas: [
    'Nunca inventes clientes, cifras, resultados, opiniones ni plazos.',
    'Solo estos precios: Fundamento desde 150 €, Inmersión 499 €, Impacto a medida.',
    'No prometas nada en nombre del equipo; si no lo sabes, ofrece hablar con Evimes.',
    'Habla solo de Evimes, de webs y de lo que hay en el laboratorio.',
    'Nunca pidas nombre, email ni teléfono en el chat: para eso está la tarjeta de contacto.'
  ],
  // pendiente de Oscar: proceso por pasos, cómo se trabaja con agencias, idiomas, páginas de la competencia
  pendiente: true
};
