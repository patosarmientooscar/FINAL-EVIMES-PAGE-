# BRIEF — Web Evimes: la oficina
_16 nov 2026 · Oscar_

Rediseño de evimesweb.com. La home es una sola escena: estás sentado en la silla del jefe, en la oficina de Evimes. La oficina se abre con el scroll, los proyectos salen del monitor como cards, las cifras aparecen en el techo y, al bajar la mirada, la web pasa a secciones planas (planes, servicios, preguntas, contacto). Nada se genera ni se construye sin el visto bueno de Oscar.

> La idea anterior (fachada, ventana, pasillo, salas de cristal, arcade, balcón) está abandonada y archivada en `_archivo/idea-estudio/` (código, assets, BRIEF/CLAUDE/PRODUCT antiguos e index). No se borra nada.

## Reglas que se mantienen
- Nada de vídeos generados ni secuencias de fotogramas. Imágenes fijas + cámara en código.
- Todo super clean: ni deformaciones ni parpadeos. Si algo no queda perfecto, se quita (y se dice).
- Ningún texto, logo ni contenido de pantalla dentro de las imágenes generadas: siempre HTML/SVG encima. Excepción aceptada por Oscar: el logo EVIMES grabado en la pared navy del panorama (no se añade otro encima).
- Nada inventado: ni clientes, ni cifras, ni garantías, ni plazos. Las mediciones son reales y con fecha.

## Estructura de index.html
1. **Hero plano** (SEO, rápido): render plano de la oficina desenfocado y teñido de navy; H1 "Diseño web en Madrid que convierte visitas en clientes."; "Webs rápidas, a medida y pensadas para vender. Desde 150 €."; "Pide tu propuesta" + "Ver proyectos"; tres datos de `config.cifras`.
2. **La oficina se abre** (panorama 360°): el hero sube como un telón, el fondo pasa a nítido y cruza al panorama en el mismo encuadre (yaw 0°, pitch +5°); dolly fov 62 → 55. El ratón mira ±12° / ±6° con inercia; en móvil, arrastre y giroscopio.
3. **Proyectos**: cinco miniaturas en el monitor; cada una se convierte en su card (mismo elemento) y vuela a un arco de cinco delante de la mesa. Hover = vista previa vertical; clic = detalle casi a pantalla completa (captura, qué necesitaba, informe PageSpeed real, "Ver web"). Arrastre o flechas rotan el arco.
4. **Cifras en el techo**: la mirada sube; cuatro cifras llegan desde el fondo una tras otra, quedan en fila con "Diseñado para captar." y la mirada baja.
5. **Planes**: la oficina se desenfoca a navy; tres cards con el mismo material suben escalonadas. Fundamento (desde 150 €), Inmersión (500 €, recomendado), Impacto (a medida).
6. **También hacemos**: Software e IA · Automatización de servicios · Plantillas de portfolio para fotógrafos.
7. **Preguntas frecuentes** (pendientes de texto).
8. **Contacto**: tipo de negocio, nombre, WhatsApp y plan preseleccionado. Sin backend: envío por WhatsApp (si hay número en config) o correo.
9. **Pie**: logo, firma, email y legales.

Menú fijo de cristal: Proyectos · Planes · Servicios · Contacto + "Pide tu propuesta". WhatsApp flotante solo si `config.whatsapp` tiene número.

Páginas planas: `proyectos.html`, `planes.html`, `software-ia.html`, `automatizacion.html`, `plantillas-fotografos.html` y las legales.

## Assets
- `assets/oficina/pano-{5792,4096,2048}.jpg`: panorama equirectangular 2:1 desde la silla. Costura visible en ±180°: la cámara nunca mira ahí (yaw [−115°, +115°], pitch [−38°, +62°]).
- `assets/oficina/hero-*.{avif,webp,jpg}`: renders planos (tools/render-hero.sh).
- `assets/oficina/boli.png`: boli negro mate (detalle desactivado: queda fuera de cuadro).
- `assets/proyectos/`: capturas de Disco (Playwright) e informes Lighthouse (JSON + HTML + captura).

## Estética
Mundo de la foto: nogal, hormigón, ladrillo blanco, pared navy. Cards de material sólido blanco roto (#f4f1ea), radio 14 px, sombra suave, sin cristal ni brillos (tipo Apple). Libre Baskerville en titulares y cifras; Schibsted Grotesk en el resto. Navy #080b14 de base, piedra #e9e3d8 para el texto, cian solo en el foco.

## Pendientes
- [ ] URLs de los proyectos 2–5 (ahora "Próximamente").
- [ ] Confirmar "24 h" de respuesta (ahora "Rápida") y "+10 proyectos entregados".
- [ ] Textos de las preguntas frecuentes y de las líneas de cada plan.
- [ ] Número de WhatsApp en config.
- [ ] Ajustar puntos con `?ajustar=oficina` (monitor, pantallas del equipo, taza).
- [ ] Fase cookies (consentimiento antes de cualquier analítica).
- [ ] Imagen OG propia (ahora el render del hero).
