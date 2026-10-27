# 04 · Diseño de pantallas

## 1. Sistema de diseño

| Token | Valor | Uso |
| --- | --- | --- |
| `colors.brand` | `#004E9E` | Cabeceras, botón primario, enlaces |
| `colors.accent` | `#E30613` | Acento de marca, notificaciones |
| `colors.background` | `#F4F6F9` | Fondo de pantallas |
| `colors.surface` | `#FFFFFF` | Tarjetas, inputs |
| `colors.success` | `#15803D` | Stock saludable (badge verde) |
| `colors.warning` | `#B45309` | Stock bajo (badge ámbar) |
| `colors.danger` | `#B91C1C` | Sin stock, errores, CTA destructiva |
| `radius.md` | 12 | Botones e inputs |
| `radius.lg` | 16 | Tarjetas |
| `spacing` | 4/8/12/16/24/32 | Escala única (sin números mágicos) |

Componentes base: `AppButton`, `AppTextInput`, `SearchBar`, `ProductCard`, `StockBadge`,
`StatCard`, `RoleBadge`, `SectionHeader`, `Screen`, `LoadingState`, `EmptyState`,
`ErrorState`.

Accesibilidad:

- Todo control es `Pressable` con `accessibilityRole` y `accessibilityLabel`.
- El badge de stock anuncia «Stock: N unidades» / «Sin stock».
- Contraste AA en textos (gris `#6B7280` sobre blanco ≥ 4.5:1 en tamaños pequeños).
- Objetivos táctiles ≥ 44 pt; inputs de 48 pt.
- Se respeta el escalado de fuente del sistema (no `allowFontScaling={false}`).

## 2. Mapa de pantallas

| # | Pantalla | Rol | Propósito | Endpoint |
| --- | --- | --- | --- | --- |
| 1 | Splash | — | Espera de sesión y perfil | — |
| 2 | Configuración | — | Falta `.env` de Firebase | — |
| 3 | Error de perfil | — | Fallo de red al cargar perfil | `GET /users/me` |
| 4 | Login | — | Autenticación email/contraseña | Firebase Auth |
| 5 | Lista de productos | Todos | Recientes + búsqueda | `GET /products` |
| 6 | Detalle | Todos | Ficha, stock y acceso a edición | `GET /products/:barcode` |
| 7 | Dashboard | Todos | Resumen y prioridades | `GET /dashboard` |
| 8 | Stock bajo | Supervisor+ | Ranking de reposición | `GET /stock/low-stock` |
| 9 | Admin home | Admin | Menú de administración | — |
| 10 | Gestión de stock | Admin | Consulta y fija unidades | `GET /products/:barcode`, `PUT /stock/:barcode` |
| 11 | Usuarios | Admin | Lista y cambio de rol | `GET /users`, `PATCH /users/:uid/role` |
| 12 | Perfil | Todos | Identidad, permisos, logout | `GET /users/me` |

## 3. Detalle por pantalla

### 1. Splash (`SplashScreen`)

- Fondo azul de marca, logo «C», nombre y spinner.
- Se muestra mientras `status` es `booting` o `loadingProfile`.
- Sin interacción.

### 2. Configuración pendiente (`ConfigErrorScreen`)

- Lista las variables `EXPO_PUBLIC_*` necesarias y cómo reiniciar Expo.
- Evita el clásico arranque en blanco cuando falta configuración.
- Visible solo en desarrollo; en producción las variables se embuten en el build.

### 3. Error de perfil (`ProfileErrorScreen`)

- `ErrorState` con mensaje del fallo (red, 5xx) + botón «Reintentar».
- Botón secundario «Cerrar sesión».
- Cubre el caso en que Firebase autentica pero la API no responde.

### 4. Login (`LoginScreen`)

```
┌──────────────────────────────┐
│  [C] Carrefour               │  ← bloque azul de marca
│  Stock Mobile                │
│  Consulta de productos…      │
├──────────────────────────────┤
│  Acceso empleados            │
│  Correo   [______________]   │
│  Contraseña [___________] 👁  │
│  ⚠ mensaje de error          │
│  [ Iniciar sesión ]          │
│  ¿No tienes acceso? …        │
└──────────────────────────────┘
```

- Validación local: email con `@` y contraseña ≥ 6; después Firebase valida.
- Errores mapeados a español (`auth/invalid-credential`, `too-many-requests`, red…).
- Al autenticar, el listener carga el perfil y navega automáticamente (no hay `navigate`
  manual desde el login).
- `KeyboardAvoidingView` + scroll para teclados pequeños.
- Si el usuario no está provisionado, se cierra la sesión y se explica el motivo.

### 5. Lista de productos (`ProductListScreen`)

- `SearchBar` fija arriba; debounce de 400 ms.
- Sin texto: «Productos recientes» (`GET /products`, orden por última actualización de la caché).
- Con texto: búsqueda por nombre/marca o código de barras exacto.
- Tarjeta: imagen 64×64, nombre (2 líneas), marca · categoría, código y badge de stock.
- Estados: carga inicial, error con reintento, vacío (sin productos / sin resultados),
  pull-to-refresh.
- Tocar una tarjeta abre el detalle.

### 6. Detalle (`ProductDetailScreen`)

- Imagen grande (200 px) con placeholder si no hay.
- Nombre, chips de marca/categoría/formato.
- Tarjeta de stock: cantidad grande, badge, «Actualizado: fecha», aviso si es 0.
- Si el rol es admin: botón «Editar stock de este producto» → `AdminTab/StockManagement`
  con el barcode precargado.
- Tabla de información: marca, categoría, formato, código de barras.
- Pull-to-refresh. Registra la visita (estadística) en el backend.
- Nota de fuentes: OpenFoodFacts para producto, Carrefour para stock.

### 7. Dashboard (`DashboardScreen`)

- Saludo + rol.
- Cuatro `StatCard`: productos con seguimiento, unidades totales, stock bajo (ámbar si > 0)
  y sin stock (rojo si > 0).
- Supervisor+: «Prioridad de reposición» con los 5 productos más urgentes y enlace «Ver
  todo» a la pestaña de stock bajo.
- «Más consultados» con el top 5 y stock.
- Recarga al enfocar la pestaña y con pull-to-refresh.
- Empleados ven los agregados y el top, pero `lowStock` llega `null` del backend.

### 8. Stock bajo (`LowStockScreen`)

- Solo supervisor/admin.
- Chips de umbral: Predeterminado, ≤ 5, ≤ 10, ≤ 20; recarga al cambiar.
- Lista ordenada de menor a mayor stock con badge.
- Pull-to-refresh; tocar abre el detalle dentro de la misma pestaña.
- Vacío positivo: «Sin alertas de stock».

### 9. Admin home (`AdminHomeScreen`)

- Comprobación defensiva del rol (aunque la pestaña no se monte para no admins).
- Dos acciones: Gestión de stock y Gestión de usuarios.
- Nota sobre altas de cuentas vía backoffice/API.

### 10. Gestión de stock (`StockManagementScreen`)

```
Buscar producto
[ Código de barras ............ ] [Buscar]
┌ ProductCard ──────────────────┐
│ Leche entera · 48 uds.        │
└───────────────────────────────┘
Stock actual            48 uds.
───────────────────────────────
Nueva cantidad
[ − ]   [   48   ]   [ + ]
[ Guardar stock ]
```

- Acepta barcode desde el detalle (`route.params.barcode`) y autocar ga.
- Valida 8–14 dígitos antes de llamar; muestra 404 como «producto no encontrado».
- Solo enteros ≥ 0; botones ± y entrada numérica.
- Éxito inline («Stock actualizado a N unidades»), error inline.
- Tras guardar, refleja la respuesta del servidor (no un cálculo local).
- Teclado numérico y `KeyboardAvoidingView`.

### 11. Usuarios (`UserManagementScreen`)

- Contador de personas, aviso de que el cambio es inmediato.
- Fila: avatar con iniciales, nombre (con «(tú)»), email, `RoleBadge`, chevron.
- Modal centrado con los tres roles, descripción y marca del actual.
- Al elegir: `PATCH /users/:uid/role`; actualización optimista de la fila solo con la
  respuesta del servidor.
- Errores de negocio (`CANNOT_DEMOTE_SELF`, `LAST_ADMIN`) se muestran en un `Alert`.
- Pull-to-refresh y estado vacío.
- El alta de cuentas no está en la app: se hace con `POST /users` desde backoffice.

### 12. Perfil (`ProfileScreen`)

- Tarjeta con iniciales, nombre, email y rol.
- Permisos del rol (check/cross) para que el usuario entienda qué puede hacer.
- Datos técnicos: UID, URL de API, versión.
- «Cerrar sesión» con confirmación; limpia stores y vuelve al login.

## 4. Estados y mensajes

| Estado | Patrón | Copia |
| --- | --- | --- |
| Cargando | Spinner + texto contextual | «Cargando producto…» |
| Error | Icono + título + mensaje + Reintentar | «No se pudo cargar la información» |
| Vacío | Icono + título + sugerencia/acción | «Sin resultados» |
| Sin stock | Badge rojo + aviso en detalle | «Producto sin unidades disponibles» |
| Stock bajo | Badge ámbar | «N uds.» (≤ umbral) |
| Éxito | Caja verde inline | «Stock actualizado a N unidades» |

Los mensajes evitan jerga técnica; el `requestId` solo se muestra en logs/soporte, no en UI.

## 5. Responsive y plataforma

- Diseño vertical, una columna; en tablets las tarjetas de estadísticas fluyen en 2–3
  columnas por `flexWrap`.
- `SafeAreaProvider` + cabeceras nativas; el tab bar respeta el inset inferior.
- Android back: nativo por stack; el modal de roles se cierra con `onRequestClose`.
- Sin modo oscuro en el MVP (`userInterfaceStyle: light`).
