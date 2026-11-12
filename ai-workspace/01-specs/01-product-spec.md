# Especificación de Producto y Reglas de Negocio — SaaS-O-Matic

> **Versión:** 1.0.0  
> **Estado:** Aprobado para implementación  
> **Stack objetivo:** Backend Python (FastAPI + SQLite) · Frontend Angular · Moneda canónica `EUR`

---

## 1. Visión General del Sistema

**SaaS-O-Matic** es una herramienta interna para el equipo comercial diseñada para registrar clientes corporativos, simular escenarios de consumo SaaS multi-variable, optimizar la selección de planes frente a sobrecostes y presentar presupuestos mensuales en múltiples divisas en tiempo real.

### Principios Rectores
1. **EUR como fuente única de verdad:** Todo cálculo en backend y todo importe persistido en SQLite se expresa exclusivamente en euros (`EUR`, almacenado en céntimos enteros para evitar errores de coma flotante).
2. **Inmutabilidad histórica de simulaciones:** Cada simulación guardada congela los valores de tarifa de plan, tipo impositivo del país, política de excedentes y desglose de costes vigentes en el momento de su creación.
3. **Paridad de cálculo Frontend/Backend:** El simulador en Angular replica exactamente el algoritmo del backend para ofrecer respuesta instantánea al mover sliders/controles; no obstante, el backend recalcula y valida de forma autoritativa al persistir (`POST /simulations`).

---

## 2. Catálogo de Planes y Umbrales Incluidos

Todo cliente corporativo contrata un **Plan** con una cuota fija mensual base que incluye umbrales mensuales de **almacenamiento** y **llamadas a la API**.

| Código de Plan | Nombre Comercial | Cuota Fija Mensual (EUR) | Almacenamiento Incluido | Llamadas API Incluidas / mes |
| :--- | :--- | :---: | :---: | :---: |
| `STARTER` | Plan Base / Starter | **29,00 €** (`2900` cts) | **25 GB** | **100.000** |
| `PRO` | Plan Profesional | **79,00 €** (`7900` cts) | **100 GB** | **500.000** |
| `ENTERPRISE` | Plan Corporativo | **199,00 €** (`19900` cts) | **500 GB** | **2.000.000** |

### Política de Excedentes (`overage_policy`)
Cada plan admite configurar cómo se comportan el almacenamiento y las llamadas API cuando superan los umbrales incluidos:

1. **`PROGRESSIVE` (Pago progresivo por exceso):**
   * Permite simular y contratar consumo por encima de los umbrales del plan.
   * El excedente se factura mediante **tramos progresivos crecientes** (a mayor exceso, mayor tarifa marginal), incentivando al comercial a comparar el coste frente a subir de plan.
2. **`HARD_CAP` (Límite estricto / Plan cerrado):**
   * No permite superar ni el almacenamiento incluido ni las llamadas API incluidas del plan elegido.
   * En el backend, cualquier petición a `POST /simulations` con `storage_gb > included_storage_gb` o `estimated_api_calls > included_api_calls` debe ser rechazada con `422 Unprocessable Entity` (`code: "PLAN_LIMIT_EXCEEDED"`).
   * En el frontend, al estar activo `HARD_CAP`, los controles quedan acotados al máximo del plan (o muestran un aviso bloqueante indicando que se alcanzó el límite y sugiriendo cambiar a `PROGRESSIVE` o mejorar de plan).
   * El coste adicional por exceso en este modo es siempre `0,00 €`.

> **Asignación por defecto:** Al registrar un cliente en `POST /customers`, el comercial indica el `plan` y la `overage_policy` por defecto (si se omite `overage_policy`, toma `'PROGRESSIVE'`). En `POST /simulations`, si no se especifica `overage_policy`, se hereda la del cliente; si se especifica, permite al comercial simular el escenario alternativo para ese presupuesto.

---

## 3. Algoritmo de Facturación y Cálculo de Costes

### 3.1. Fórmula General

$$\text{Subtotal Base (sin IVA)} = \text{Cuota Plan} + \text{Coste Usuarios} + \text{Coste Extra Almacenamiento} + \text{Coste Extra API}$$

$$\text{Impuesto (IVA/Tax)} = \text{Redondeo}_{\text{HALF\_UP}}\left(\text{Subtotal Base} \times \frac{\text{Tipo Impositivo (\%)}}{100},\ 2\text{ decimales}\right)$$

$$\text{Coste Total Mensual (EUR)} = \text{Subtotal Base} + \text{Impuesto}$$

> **Regla de mínimo de usuarios:** El mínimo de usuarios activos permitido es **`0`**. Con `0` usuarios activos, el coste por usuarios es `0,00 €`, pero el subtotal nunca es `0,00 €` porque siempre incluye la cuota fija del plan contratado (por ejemplo, `29,00 €` + impuestos en `STARTER`).

---

### 3.2. Tarificación Gradual Acumulativa por Usuarios

Sea $U \in \mathbb{Z}_{\ge 0}$ el número de usuarios activos (`0 <= U <= 100000`):

| Tramo | Rango de Usuarios | Tarifa Unitaria |
| :--- | :--- | :---: |
| **Tramo 1** | `1` a `10` usuarios (desde `0`) | **10,00 € / usuario** (`1000` cts) |
| **Tramo 2** | `11` a `50` usuarios | **8,00 € / usuario** (`800` cts) |
| **Tramo 3** | Más de `50` usuarios (`>= 51`) | **5,00 € / usuario** (`500` cts) |

**Cálculo en céntimos enteros:**
* $u_1 = \min(U, 10)$
* $u_2 = \max(0,\ \min(U, 50) - 10)$
* $u_3 = \max(0,\ U - 50)$
* $\text{users\_cost\_cents} = 1000 \cdot u_1 + 800 \cdot u_2 + 500 \cdot u_3$

**Casos de prueba de referencia (solo componente de usuarios + ejemplo con `STARTER`):**
* $U = 0$: usuarios = `0,00 €`; con `STARTER` (`29,00 €`) = `29,00 €` subtotal.
* $U = 10$: usuarios = $10 \times 10 = \mathbf{100,00\ €}$.
* $U = 11$: usuarios = $(10 \times 10) + (1 \times 8) = \mathbf{108,00\ €}$.
* $U = 15$: usuarios = $(10 \times 10) + (5 \times 8) = \mathbf{140,00\ €}$ *(coincide con el ejemplo del enunciado)*. Con `STARTER` dentro de límites = $29 + 140 = \mathbf{169,00\ €}$ subtotal.
* $U = 50$: usuarios = $(10 \times 10) + (40 \times 8) = \mathbf{420,00\ €}$.
* $U = 51$: usuarios = $420 + (1 \times 5) = \mathbf{425,00\ €}$.

---

### 3.3. Coste Progresivo por Exceso de Almacenamiento (solo en modo `PROGRESSIVE`)

Sea $G \in \mathbb{Z}_{\ge 0}$ el almacenamiento contratado en GB (`0 <= G <= 100000`) y $G_{\text{inc}}$ el incluido en el plan (`25` GB para `STARTER`).

$$\Delta G = \max(0,\ G - G_{\text{inc}})$$

| Tramo de Exceso | Rango de GB Extra ($\Delta G$) | Tarifa Progresiva |
| :--- | :--- | :---: |
| **Exceso Tramo 1** | `1` a `50` GB extra | **0,50 € / GB** (`50` cts) |
| **Exceso Tramo 2** | `51` a `200` GB extra | **0,80 € / GB** (`80` cts) |
| **Exceso Tramo 3** | Más de `200` GB extra (`>= 201`) | **1,20 € / GB** (`120` cts) |

**Cálculo en céntimos enteros:**
* $g_1 = \min(\Delta G, 50)$
* $g_2 = \max(0,\ \min(\Delta G, 200) - 50)$
* $g_3 = \max(0,\ \Delta G - 200)$
* $\text{extra\_storage\_cost\_cents} = 50 \cdot g_1 + 80 \cdot g_2 + 120 \cdot g_3$

*Ejemplo (`STARTER`, $G = 85$ GB):* $\Delta G = 85 - 25 = 60$ GB extra $\rightarrow$ $(50 \times 0,50) + (10 \times 0,80) = 25,00 + 8,00 = \mathbf{33,00\ €}$.

---

### 3.4. Coste Progresivo por Exceso de Llamadas API (solo en modo `PROGRESSIVE`)

Sea $A \in \mathbb{Z}_{\ge 0}$ las llamadas API mensuales estimadas (`0 <= A <= 100000000`) y $A_{\text{inc}}$ las incluidas en el plan (`100.000` para `STARTER`).

$$\Delta A = \max(0,\ A - A_{\text{inc}})$$

El exceso se computa en bloques de **1.000 llamadas** redondeados al alza:

$$B = \left\lceil \frac{\Delta A}{1000} \right\rceil = \left\lfloor \frac{\Delta A + 999}{1000} \right\rfloor \quad (\text{con } B = 0 \text{ si } \Delta A = 0)$$

| Tramo de Exceso | Bloques de 1k Extra ($B$) | Equivalente en Llamadas Extra | Tarifa Progresiva por 1.000 llamadas |
| :--- | :--- | :--- | :---: |
| **Exceso Tramo 1** | `1` a `100` bloques | `1` a `100.000` llamadas extra | **0,05 € / 1k** (`5` cts) |
| **Exceso Tramo 2** | `101` a `500` bloques | `100.001` a `500.000` llamadas extra | **0,08 € / 1k** (`8` cts) |
| **Exceso Tramo 3** | Más de `500` bloques | Más de `500.000` llamadas extra | **0,12 € / 1k** (`12` cts) |

**Cálculo en céntimos enteros:**
* $b_1 = \min(B, 100)$
* $b_2 = \max(0,\ \min(B, 500) - 100)$
* $b_3 = \max(0,\ B - 500)$
* $\text{extra\_api\_cost\_cents} = 5 \cdot b_1 + 8 \cdot b_2 + 12 \cdot b_3$

*Ejemplo (`STARTER`, $A = 250.000$):* $\Delta A = 150.000 \rightarrow B = 150$ bloques $\rightarrow$ $(100 \times 0,05) + (50 \times 0,08) = 5,00 + 4,00 = \mathbf{9,00\ €}$.

---

## 4. Países e Impuestos (Tax / IVA)

Los países se identifican mediante código **ISO 3166-1 alpha-2** en mayúsculas. La tabla oficial soportada por el sistema es:

| Código (`country_code`) | País | Tipo Impositivo (`tax_rate_percent`) | Validación Fiscal Estricta |
| :---: | :--- | :---: | :--- |
| `ES` | España | **21,00 %** | Algoritmo oficial DNI / NIE / CIF |
| `PT` | Portugal | **23,00 %** | Formato alfanumérico genérico |
| `FR` | Francia | **20,00 %** | Formato alfanumérico genérico |
| `DE` | Alemania | **19,00 %** | Formato alfanumérico genérico |
| `IT` | Italia | **22,00 %** | Formato alfanumérico genérico |
| `NL` | Países Bajos | **21,00 %** | Formato alfanumérico genérico |
| `BE` | Bélgica | **21,00 %** | Formato alfanumérico genérico |
| `IE` | Irlanda | **23,00 %** | Formato alfanumérico genérico |
| `GB` | Reino Unido | **20,00 %** | Formato alfanumérico genérico |
| `US` | Estados Unidos | **0,00 %** | Formato alfanumérico genérico |
| `MX` | México | **16,00 %** | Formato alfanumérico genérico |
| `CO` | Colombia | **19,00 %** | Formato alfanumérico genérico |

> **Regla de redondeo fiscal:** El cálculo del impuesto sobre `subtotal_cents` se realiza con aritmética decimal exacta (`Decimal`) aplicando `ROUND_HALF_UP` al céntimo más cercano:
> $$\text{tax\_amount\_cents} = \text{ROUND\_HALF\_UP}\left(\frac{\text{subtotal\_cents} \times \text{tax\_rate\_percent}}{100},\ 0\right)$$

---

## 5. Reglas de Validación de Clientes y Tax ID

### 5.1. Validación General de `POST /customers`
* `company_name`: Cadena no vacía tras `strip()`, entre `2` y `150` caracteres.
* `contact_email`: Formato RFC válido de correo electrónico, normalizado a minúsculas.
* `country_code`: Debe existir en el catálogo de países soportados (`GET /countries`).
* `plan`: Uno de `STARTER`, `PRO`, `ENTERPRISE`.
* `overage_policy`: Uno de `PROGRESSIVE`, `HARD_CAP` (por defecto `PROGRESSIVE`).
* `tax_id`:
  * **Normalización previa:** Eliminar espacios en blanco, guiones (`-`) y puntos (`.`), y convertir a **MAYÚSCULAS** antes de validar y almacenar (p. ej., `b-58818501` $\rightarrow$ `B58818501`).
  * **Unicidad:** No puede existir otro cliente registrado con el mismo par `(country_code, tax_id)` normalizado. Si existe, devolver **`409 Conflict`**.

### 5.2. Algoritmo Estricto de Validación para España (`country_code == "ES"`)
Se aceptan **DNI**, **NIE** y **CIF** (NIF de personas jurídicas y entidades). Todos deben tener longitud exacta de **9 caracteres** tras la normalización. Cualquier fallo devuelve **`422 Unprocessable Entity`** con mensaje descriptivo.

#### A. DNI (Documento Nacional de Identidad)
* **Patrón:** `^[0-9]{8}[A-Z]$`
* **Tabla de control (Módulo 23):** `TRWAGMYFPDXBNJZSQVHLCKE` (23 caracteres; excluye `I`, `Ñ`, `O`, `U`).
* **Cálculo:** $\text{idx} = \text{int}(\text{primeros 8 dígitos}) \bmod 23$. La novena letra debe ser exactamente `TABLA[idx]`.

#### B. NIE (Número de Identidad de Extranjero)
* **Patrón:** `^[XYZ][0-9]{7}[A-Z]$`
* **Conversión de prefijo:** `X -> "0"`, `Y -> "1"`, `Z -> "2"`.
* **Cálculo:** Concatenar el dígito convertido con los 7 dígitos siguientes para formar un número de 8 cifras y aplicar exactamente la misma regla Módulo 23 del DNI (`TABLA[numero % 23]`).

#### C. CIF (Código de Identificación Fiscal / NIF Corporativo)
* **Patrón:** `^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$`
  * Primer carácter: Letra de tipo de organización.
  * Caracteres 2 a 8: 7 dígitos $d_1 d_2 d_3 d_4 d_5 d_6 d_7$ (indexados del 1 al 7).
  * Carácter 9: Carácter de control.
* **Cálculo del dígito de control ($D$):**
  1. **Suma de posiciones pares:** $A = d_2 + d_4 + d_6$.
  2. **Suma de posiciones impares:** Para cada $d_i \in \{d_1, d_3, d_5, d_7\}$, calcular $p_i = 2 \times d_i$ y sumar sus dígitos $\lfloor p_i / 10 \rfloor + (p_i \bmod 10)$ para obtener $B$.
  3. **Total:** $S = A + B$.
  4. **Unidad:** $C = S \bmod 10$.
  5. **Dígito de control:** $D = (10 - C) \bmod 10$ (si $C = 0 \Rightarrow D = 0$).
* **Tabla de letras de control:** `CIF_LETRAS = "JABCDEFGHI"` (índice `0 -> 'J'`, `1 -> 'A'`, ..., `9 -> 'I'`).
* **Validación según letra inicial de organización:**
  * **Control estrictamente numérico** (`A, B, E, H`): el carácter 9 debe ser `str(D)`.
  * **Control estrictamente alfabético** (`P, Q, R, S, N, W`): el carácter 9 debe ser `CIF_LETRAS[D]`.
  * **Control dual (dígito o letra)** (`C, D, F, G, J, U, V`): el carácter 9 es válido si coincide con `str(D)` **o** con `CIF_LETRAS[D]`.

#### D. Países distintos de España (`country_code != "ES"`)
* **Patrón:** `^[A-Z0-9]{5,20}$` tras normalización. Debe contener al menos un carácter alfanumérico válido entre 5 y 20 caracteres.

---

## 6. Requisitos de Interfaz (Frontend Angular) y Multi-Divisa

### 6.1. Vistas Obligatorias
1. **Buscador y Dashboard:**
   * Barra de búsqueda en tiempo real (con *debounce* ~300 ms) que consulta `GET /customers?q=...` por nombre de empresa o Tax ID.
   * Listado en tarjetas *responsive* con resumen de plan, país, Tax ID y acceso rápido al detalle y creación de nuevo cliente.
2. **Detalle del Cliente (Cards):**
   * Tarjeta principal con datos corporativos, plan contratado, umbrales incluidos (`25 GB / 100k API` en `STARTER`, etc.), política de excedentes (`PROGRESSIVE` / `HARD_CAP`) y tasa de IVA del país.
   * Historial cronológico de simulaciones guardadas (`GET /customers/{id}/simulations`) con desglose completo convertido a la divisa seleccionada.
3. **Formulario de Simulación Interactiva:**
   * Slider/input numérico para `active_users` (mínimo `0`, slider sugerido `0–200` con input directo hasta `100.000`).
   * Controles para `storage_gb` y `estimated_api_calls` (con indicador visual de porcentaje respecto al umbral del plan y selector/aviso de política `PROGRESSIVE` vs `HARD_CAP`).
   * Proyección en tiempo real desglosada: Cuota Plan + Usuarios por tramo + Exceso Almacenamiento + Exceso API + IVA + Total Mensual, todo mostrado en la divisa activa y con equivalencia en `EUR`.
   * Botón **Guardar Simulación** (`POST /simulations`) que persiste en SQLite y actualiza el historial sin recargar la página.

### 6.2. Integración con API Externa de Divisas y Manejo de Fallos
* **Fuente primaria:** `https://open.er-api.com/v6/latest/EUR` (timeout máximo de cliente: `5000 ms`).
* **Divisas soportadas inicialmente en el selector:** `EUR` (base `1.0`), `USD`, `GBP`, `CHF`, `MXN`, `COP` (o cualquier código presente en `rates` de la respuesta).
* **Máquina de estados de tipos de cambio:**
  1. **`loading`:** La UI arranca inmediatamente operativa en `EUR` (`1.0`) mientras carga los tipos en segundo plano; muestra un indicador discreto de carga en el selector de divisa.
  2. **`live`:** Respuesta válida (`result == "success"` y `rates` presente). Se guarda en `localStorage` junto con `fetched_at` (timestamp ISO) y `next_update_unix`.
  3. **`cached_fallback`:** Si falla la petición HTTP o hay timeout, pero existe caché previa en `localStorage` (válida o expirada), se usan los tipos cacheados y se muestra un **banner de advertencia no bloqueante** (*"Sin conexión con el servicio de divisas. Mostrando tipos guardados el [fecha/hora]."* + botón *Reintentar*).
  4. **`offline_eur_only`:** Si falla la petición y no hay caché previa, se fija la visualización a `EUR`, se deshabilitan las divisas extranjeras con tooltip explicativo y se muestra un **banner de error con botón Reintentar**. Nunca se muestran conversiones inventadas o silenciosamente desactualizadas sin aviso.

