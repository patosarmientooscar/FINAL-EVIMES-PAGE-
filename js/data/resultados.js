/* ==========================================================================
   Resultados medidos de los proyectos. EDITABLE. Solo datos REALES.
   León's: cada bloque sale solo cuando TODOS sus datos están puestos.
   Mientras no haya ninguno completo, proyectos.html enseña "Resultados en camino".

   1) La caja de "más ventas":
   - aumentoVentasPct: número (p. ej. 32 → "+32 %").
   - serie: [{ etiqueta: 'Ene', valor: 120 }, …] (ventas por mes, en la unidad que sea).
   - periodo: texto, p. ej. 'Enero – junio de 2027'.
   - fuente: de dónde sale el dato, p. ej. 'Ventas del TPV de León\'s'.
   2) pagespeed: los 4 círculos de PageSpeed Insights (como los de Disco).
   - url, fecha ('AAAA-MM-DD') y las 4 cifras (0–100); agentic es opcional ('2/2').
   ========================================================================== */
window.EVIMES_RESULTADOS = {
  leons: {
    aumentoVentasPct: null, serie: null, periodo: null, fuente: null,
    pagespeed: { url: null, fecha: null, rendimiento: null, accesibilidad: null, buenasPracticas: null, seo: null, agentic: null }
  }
};
