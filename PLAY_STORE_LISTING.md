# Ficha de Play Console — Easy Kite

Contenido listo para copiar/pegar en cada sección. Borra este archivo cuando ya no lo necesites (no es parte de la app).

## 1. Ficha principal de la Play Store (Presencia en Store → Ficha principal)

**Nombre de la app** (30 car. máx.)
```
Easy Kite
```

**Descripción breve** (80 car. máx.)
```
Analiza tu sesión de kite/wing foil: pose, biomecánica, viento y plan de mejora IA.
```

**Descripción completa** (4000 car. máx.)
```
Easy Kite es tu entrenador de kitesurf y wing foil. Sube o graba un video de tu sesión y la app:

• Detecta tu pose corporal cuadro a cuadro con visión por computador
• Calcula ángulos de rodilla, cadera, inclinación de tronco y balance
• Segmenta la sesión en maniobras: saltos, aterrizajes, cambios de dirección
• Detecta errores técnicos comunes (rodillas rígidas, espalda curvada, asimetrías)
• Compara tu sesión contra sesiones anteriores tuyas o contra un video de referencia
• Genera un plan de mejora personalizado con IA
• Estima altura de salto, velocidad punta y distancia recorrida por GPS
• Te muestra el pronóstico de viento de tu spot hora por hora, con recomendación de tamaño de cometa/ala según tu peso
• Exporta reportes en PDF/Excel de tu sesión

Pensada para deportistas de cualquier nivel, entrenadores y escuelas de kitesurf/wing foil.

Nota: las métricas biomecánicas son estimaciones a partir de una sola cámara, pensadas para orientar tu progreso — no son mediciones clínicas ni reemplazan el criterio de un entrenador certificado.
```

**Categoría sugerida**: Salud y fitness (o Deportes, si esa opción encaja mejor con lo que ves en tu cuenta)

**Correo de contacto**: alexander.barrios@ucp.edu.co

**Política de privacidad**: https://claude.ai/code/artifact/6d581944-e87f-41cd-9865-09cad3f43fee

---

## 2. Contenido de la app (Política → Contenido de la app)

### Acceso a la app
Toda la app requiere iniciar sesión — no hay ninguna pantalla funcional sin cuenta. Google te va a pedir una **cuenta de prueba** para que el revisor pueda entrar:
- Crea un usuario de prueba real (regístrate en tu propia app con un correo tipo `revisor.easykite@gmail.com`)
- En Play Console, sección "Acceso a la app", elige "Todas las funciones tienen restricciones" y pega ese usuario/contraseña

### Anuncios
**No** — la app no muestra anuncios.

### Clasificación de contenido (cuestionario)
Va a hacerte preguntas sí/no sobre violencia, contenido sexual, lenguaje, sustancias, juego de azar, contenido generado por usuarios visible públicamente, etc. Para Easy Kite, la respuesta honesta a casi todo es **No**:
- No hay violencia, contenido sexual, lenguaje ofensivo ni apuestas
- Los videos que suben los usuarios **no son públicos** — solo los ve el propio usuario y, si pertenece a un grupo, su entrenador/escuela
- Resultado esperable: clasificación "Para todos" o equivalente más baja

### Público objetivo
Sugerido: 18+ o "Adultos" — es una app de deporte de riesgo (kite/wing foil) con manejo de peso/altura y pagos de suscripción, no está diseñada para niños. Si permites cuentas gestionadas por escuelas para menores, acláralo en el cuestionario (tu política de privacidad ya menciona que el consentimiento de menores es responsabilidad del entrenador/escuela).

---

## 3. Sección de Seguridad de los datos (Data safety)

Esta es la parte donde más desarrolladores cometen errores — complétala con cuidado en el cuestionario interactivo de Play Console. Guía basada en lo que la app **realmente** hace:

| Tipo de dato | ¿Se recoge? | ¿Se comparte con terceros? | ¿Para qué |
|---|---|---|---|
| Ubicación (aproximada/precisa) | Sí | No (solo se envían coordenadas, sin identificarte, a Open-Meteo para el pronóstico) | Funcionalidad de la app |
| Información personal (correo, nombre) | Sí | No | Cuenta y funcionalidad |
| Fotos y videos | Sí | No | Funcionalidad principal (análisis) |
| Info de salud y fitness (actividad física) | Sí — las métricas de rendimiento derivadas del video | No | Funcionalidad de la app |
| Info financiera (compras) | Solo si el usuario se suscribe | Sí, con Stripe (el procesador de pago) | Procesar la suscripción |

- **¿Los datos se cifran en tránsito?** Sí (HTTPS/TLS en todas las conexiones)
- **¿El usuario puede pedir que se borren sus datos?** Sí (borrar video individual desde la app, o borrar cuenta completa por correo — ya está en la política de privacidad)
- **¿La recolección de datos es opcional?** El correo es obligatorio para crear cuenta; peso/altura/ubicación son opcionales pero mejoran las recomendaciones

---

## 4. Lo que YO no puedo generar (necesitas hacerlo tú o pedir ayuda de diseño)

- **Ícono de la app** (512×512 PNG para la ficha, y uno en `mobile/app.json` para el build) — hoy no existe, la app usa el ícono por defecto de Expo
- **Gráfico de funciones** (1024×500, se muestra arriba en la ficha de la Play Store)
- **Capturas de pantalla** (mínimo 2, recomendado 4-8) — hay que tomarlas de la app real corriendo en un teléfono o emulador, instalando el `.aab`/`.apk` que ya generamos

No tengo forma de generar imágenes ni de correr la app en un dispositivo esta sesión. Si quieres, puedo escribirte el SVG de un ícono simple (tema viento/cometa, con la paleta turquesa/coral de la marca) para que se lo pases a quien te ayude a exportarlo a PNG — dime si te sirve esa ruta.
