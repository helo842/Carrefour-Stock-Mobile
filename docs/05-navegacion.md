# 05 · Navegación

## 1. Árbol

```
RootNavigator (según estado de sesión)
├── SplashScreen                       boot / cargando perfil
├── ProfileErrorScreen                 fallo al cargar perfil
├── AuthNavigator
│   └── Login                          sin pestañas
└── AppTabs                            autenticado
    ├── ProductsTab  → ProductsNavigator
    │   ├── ProductList
    │   └── ProductDetail { barcode }
    ├── DashboardTab → DashboardNavigator
    │   └── Dashboard
    ├── LowStockTab  → LowStockNavigator          (supervisor+)
    │   ├── LowStock
    │   └── ProductDetail { barcode }
    ├── AdminTab     → AdminNavigator              (admin)
    │   ├── AdminHome
    │   ├── StockManagement { barcode? }
    │   └── UserManagement
    └── ProfileTab   → ProfileNavigator
        └── Profile
```

Cada pestaña es un **stack independiente** con su propia cabecera. Así el botón atrás
funciona por sección y el detalle de producto puede abrirse desde Productos o desde Stock
bajo sin saltar de pestaña.

## 2. Pestañas por rol

| Pestaña | Employee | Supervisor | Admin |
| --- | :---: | :---: | :---: |
| Productos | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Stock bajo | — | ✅ | ✅ |
| Admin | — | — | ✅ |
| Perfil | ✅ | ✅ | ✅ |

La composición se hace en `AppTabs.tsx` con `permissions.viewLowStock(role)` y
`permissions.manageStock(role)`. Los stacks no montados no existen en el árbol, por lo que
tampoco se pueden alcanzar por navegación programática accidental.

> Ocultar pestañas es UX, no seguridad. Cada endpoint vuelve a comprobar el rol; un cliente
> modificado recibe `403 INSUFFICIENT_ROLE`.

## 3. Tipos de parámetros

Definidos en `mobile/src/navigation/types.ts`:

```ts
export type ProductsStackParamList = {
  ProductList: undefined;
  ProductDetail: { barcode: string };
};

export type AdminStackParamList = {
  AdminHome: undefined;
  StockManagement: { barcode?: string } | undefined;
  UserManagement: undefined;
};

export type AppTabsParamList = {
  ProductsTab: NavigatorScreenParams<ProductsStackParamList>;
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  LowStockTab: NavigatorScreenParams<LowStockStackParamList>;
  AdminTab: NavigatorScreenParams<AdminStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
```

Los parámetros son **serializables** (solo strings), lo que mantiene la puerta abierta a deep
links y a la restauración de estado.

## 4. Flujo de sesión

```
App.tsx → initialize() → onAuthStateChanged
   ├─ sin usuario            → status signedOut  → Login
   ├─ usuario sin perfil     → 403 USER_NOT_PROVISIONED → signOut + error en Login
   ├─ error de red           → status error      → ProfileErrorScreen (reintentar/logout)
   └─ perfil cargado         → status signedIn   → AppTabs (según rol)
```

No hay navegación imperativa tras el login: el árbol se deriva del estado. Eso evita
pantallas duplicadas y carreras al cerrar sesión.

## 5. Navegación entre pestañas

Desde una pantalla anidada, `navigation.navigate('OtraTab', { screen, params })` burbujea al
tab navigator. Ejemplos reales:

```ts
// Detalle → editar stock (solo admin)
navigation.navigate('AdminTab', {
  screen: 'StockManagement',
  params: { barcode },
});

// Dashboard → detalle de producto en Productos
navigation.navigate('ProductsTab', {
  screen: 'ProductDetail',
  params: { barcode },
});

// Dashboard → pestaña de stock bajo
navigation.navigate('LowStockTab', { screen: 'LowStock' });
```

## 6. Cabeceras y tema

- Fondo azul `#004E9E`, título blanco, sin sombra (`stackScreenOptions`).
- Título por pantalla en español (`Productos`, `Detalle del producto`, `Gestión de stock`…).
- El tab bar usa el color de marca como activo y etiquetas cortas.
- El modal de cambio de rol es un `Modal` de React Native, no una ruta (no necesita URL ni
  historial).

## 7. Atrás y cierre de sesión

- Back nativo cierra el modal si está abierto; si no, retrocede en el stack de la pestaña.
- Volver desde el detalle regresa a la lista sin recargar los datos ya cargados.
- Al cerrar sesión se desmonta `AppTabs` completo: no quedan pantallas con datos del usuario
  anterior en memoria. Además se resetea el store de productos.
- Con `predictiveBackGestureEnabled` activo en Android moderno.

## 8. Cómo añadir una pantalla

1. Añade la ruta y sus params en `navigation/types.ts`.
2. Créala en `screens/` (componente puro + estados).
3. Regístrala en el stack correspondiente con título.
4. Si es una sección nueva, crea su navigator y añade la pestaña con su guard de rol.
5. Si requiere un permiso nuevo, actualízalo también en backend y en `utils/roles.ts`.

## 9. Deep links (evolución)

El esquema `carrefourstock://` ya está declarado en `app.json`. Para habilitar enlaces como
`carrefourstock://product/3560070976453`:

1. Define `linking.config` en `NavigationContainer` mapeando `ProductDetail: 'product/:barcode'`.
2. Valida el barcode antes de navegar.
3. La autenticación sigue mandando: un enlace a detalle sin sesión debe llevar a Login y
   resolver el destino tras autenticar.
