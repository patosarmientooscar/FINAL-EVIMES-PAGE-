// Datos de contacto, redes y URLs. Rellenar con los datos reales.
window.EVIMES_CONFIG = {
  // Logos vectoriales (fill="currentColor"). Cada clave alimenta los
  // elementos con data-logo="<clave>"; el SVG se incrusta en línea.
  logo: {
    header:  'assets/logo/evimes-eh.svg',       // cabecera
    favicon: 'assets/logo/evimes-eh.svg',       // origen de favicon.svg y apple-touch-icon.png
    fachada: 'assets/logo/evimes-wordmark.svg', // letras corpóreas de la fachada
    lockup:  'assets/logo/evimes-lockup.svg'    // EH + EVIMES (piezas sueltas)
  },

  // Fachada (coordenadas normalizadas 0–1 de cada keyframe: desktop 16:9, mobile vertical).
  fachada: {
    // Letras EVIMES: 4 esquinas [sup-izq, sup-der, inf-der, inf-izq].
    // Ajuste a ojo: abre index.html?ajustar=letras, arrastra y pega aquí lo copiado.
    letras: {
      desktop: [[0.6550, 0.4050], [0.8300, 0.4050], [0.8300, 0.4616], [0.6550, 0.4616]],
      mobile:  [[0.5950, 0.4580], [0.8050, 0.4580], [0.8050, 0.4782], [0.5950, 0.4782]]
    },
    // Hueco de la ventana encendida [x0, y0, x1, y1]: la cámara la lleva a llenar la pantalla.
    ventana: {
      desktop: [0.410, 0.290, 0.588, 0.773],
      mobile:  [0.285, 0.423, 0.515, 0.624]
    }
  },

  // Teléfono y email tomados del aviso legal de la web antigua.
  telefono: '+34 636 73 61 67',
  telefonoHref: 'tel:+34636736167',
  whatsapp: '',          // pendiente de confirmar, p. ej. "https://wa.me/34636736167"
  email: 'evimes@evimesweb.com',
  redes: {
    instagram: '',
    linkedin: '',
    tiktok: '',
  },
  urls: {
    home: '/',
    servicios: '/servicios.html',
    nosotros: '/nosotros.html',
    contacto: '/contacto.html',
    avisoLegal: '/aviso-legal.html',
    terminos: '/terminos.html',
    privacidad: '/privacidad.html',
    cookies: '/cookies.html',
  },
};
