# Iteration Log — Prompting Strategy, Information Architecture & Engineering Directives

Este documento registra cómo se estructuró el espacio de trabajo y se dirigió a la IA paso a paso durante la construcción de **SaaS-O-Matic**, manteniendo el control sobre el diseño, la arquitectura y la calidad del código.

---

## 1. Organización de la Información (`/ai-workspace` y `.agents/rules`)

En lugar de trabajar con prompts aislados o mezclar especificaciones con reglas operativas, la información se estructuró en dos planos complementarios:

1. **Gobernanza persistente (`.agents/rules/` — `always_on`):**
   * [architecture.md](../../.agents/rules/architecture.md): Reglas transversales (Spec-Driven Development, aprobación previa de planes, modularidad/SRP y convención de idiomas).
   * [backend-python.md](../../.agents/rules/backend-python.md): Capas estrictas en `backend/app/`, tipado PEP 484/604, prohibición de `float` para dinero (`*_cents` + `Decimal`), consultas parametrizadas y cobertura de tests.
   * [frontend-angular.md](../../.agents/rules/frontend-angular.md): Componentes `standalone`, flujo moderno (`@if`, `@for`), Signals, `OnPush`, separación `core/` → `shared/` ← `features/` y manejo explícito de estados (`loading`, `empty`, `error`, más los 4 estados de divisas).
2. **Base de conocimiento trazable (`ai-workspace/`):**
   * `01-specs/`: Fuente única de verdad ([01-product-spec.md](../01-specs/01-product-spec.md), [02-api-contract.yaml](../01-specs/02-api-contract.yaml), [03-data-model.md](../01-specs/03-data-model.md)).
   * `02-architecture/`: Documentación explicativa de las directrices ([agent-guidelines.md](../02-architecture/agent-guidelines.md)).
   * `03-plans/`: Planes técnicos aprobados antes de escribir código ([backend-implementation-plan.md](../03-plans/backend-implementation-plan.md), [frontend-implementation-plan.md](../03-plans/frontend-implementation-plan.md), [frontend-ux-refinement-plan.md](../03-plans/frontend-ux-refinement-plan.md)).
   * `history/`: Registro secuencial de prompts y respuestas clave (`01-DefineSpecs.md` → `04-Frontend.md`).
   * `quality/`: Evidencias objetivas de pruebas, linter y grado de cumplimiento ([code-audits.md](./code-audits.md), [taskReport.md](./taskReport.md), `iteration-log.md`).

---

## 2. Registro Cronológico de Iteraciones, Prompts y Directivas

### Iteración 1 — Descubrimiento de Brechas y Spec-Driven Development
* **Referencia:** [01-DefineSpecs.md](../history/01-DefineSpecs.md)
* **Cómo se prompteó:**
  * Se asignó rol explícito (*"Act as a Software architect"*) con referencia directa a [task.md](../../task.md) y `.agents/rules/`.
  * Se impuso una **restricción negativa explícita**: *"do NOT generate any backend or frontend application code yet"*.
  * Se pidió primero análisis de ambigüedades y propuesta de 3 entregables (`01-product-spec.md`, `02-api-contract.yaml`, `03-data-model.md`) antes de crear ficheros.
* **Directivas y decisiones del usuario:**
  * Se fijó el stack (`Python + FastAPI + SQLite` y `Angular`) y se ordenó limpiar placeholders vacíos previos.
  * Se resolvieron ambigüedades funcionales clave que no estaban cerradas en el enunciado:
    * Definición de umbrales base del plan (`25 GB` y `100.000` llamadas API) y creación de la dualidad **`PROGRESSIVE` vs. `HARD_CAP`**.
    * Mínimo de usuarios activos en `0` (cobrando siempre la cuota fija del plan).
    * Aceptación explícita de **DNI, NIE y CIF** para España.
    * `EUR` como única divisa persistida en base de datos.

---

### Iteración 2 — Reglas de Arquitectura y Límites de Modularidad
* **Referencia:** [02-DefineRules.md](../history/02-DefineRules.md) y [agent-guidelines.md](../02-architecture/agent-guidelines.md)
* **Cómo se prompteó:**
  * Se redactaron directrices reutilizables en tres bloques (`general`, `backend`, `frontend`) pidiendo explícitamente borrador y validación previa (*"Draft the rule file and show me..."*, *"ask if any instruction is unclear"*).
* **Directivas clave dadas a la IA:**
  * **Planificación obligatoria:** Producir plan detallado y esperar aprobación humana antes de tocar código de implementación.
  * **Aislamiento de capas:** Impedir lógica de negocio o SQL en routers de FastAPI; exigir funciones puras y `Decimal` (sin `float`) en backend; imponer `core/` / `features/` / `shared/` en Angular con manejo explícito de carga, error y estado vacío.
  * **Estandarización de idioma:** Separar código, esquemas, variables y commits (en inglés) de la especificación funcional y textos visibles para el usuario final (estrictamente en español).

---

### Iteración 3 — Planificación e Implementación Controlada del Backend
* **Referencia:** [03-backed.md](../history/03-backed.md) y [backend-implementation-plan.md](../03-plans/backend-implementation-plan.md)
* **Cómo se prompteó:**
  * Se exigió que el plan incluyera preparación de entorno (`venv`, versión de Python), matriz de tests unitarios/integración y qué debía documentarse en el `README.md` al finalizar.
* **Directivas de control y correcciones en caliente:**
  * **Control del entorno:** Tras diagnosticar conflicto entre `Python 3.9.7` en `PATH` y `Python 3.12`, se configuró el entorno manualmente y se instruyó explícitamente: *"The python environment is already configured. ASK before installing anything"*.
  * **Higiene de repositorio:** Se solicitó configurar `.gitignore` específico para `backend/` siguiendo buenas prácticas de Python antes de commitear.
  * **Seguimiento activo:** Supervisión del progreso de subtareas hasta validar los 57 tests de `pytest` y `ruff check .`.

---

### Iteración 4 — Diseño Guiado del Frontend y Validación de Decisiones UX
* **Referencia:** [04-Frontend.md](../history/04-Frontend.md) y [frontend-implementation-plan.md](../03-plans/frontend-implementation-plan.md)
* **Cómo se prompteó:**
  * Se fijaron restricciones estéticas claras desde el primer prompt (*"clean and modern, use neutral colors, only light theme. Avoid excessive animations and gradients"*).
  * Se exigió que el plan incluyera **wireframes/diseños previos** y que la IA preguntara activamente sobre decisiones abiertas (*"Include designs... Ask me about design decisions"*).
* **Correcciones directas del usuario sobre el plan (referenciando línea exacta):**
  * Apuntando directamente a `frontend-implementation-plan.md#L110`: cambio de `"Guardar Simulación en SQLite"` a simplemente **`"Guardar"`**, aplicando el criterio de que la UI no debe exponer detalles internos de persistencia al usuario comercial.
  * Confirmación de diálogo modal (`MatDialog`) con **guarda de cambios sin guardar** si el formulario está sucio (`dirty`).
  * Ajuste pragmático de controles: slider de usuarios acotado de **0 a 150** con campo numérico complementario hasta un máximo de **500**.
  * Control de arranque: bloqueo de implementación hasta confirmar la instalación local de Node.js, y diagnóstico de `PATH` en Git Bash (`MINGW64`) tras instalarlo.

---

### Iteración 5 — Auditoría Visual Real en Navegador y Refinamiento UX
* **Referencia:** [frontend-ux-refinement-plan.md](../03-plans/frontend-ux-refinement-plan.md)
* **Cómo se prompteó:**
  * Tras levantar el entorno local (`http://localhost:4200/customers`) y probar la interfaz real, el usuario detectó fricciones de usabilidad y pidió un nuevo plan de cambios antes de editar código:
    1. Corregir desalineación de iconos dentro de botones Material.
    2. Dar mayor *padding* al selector de **Divisa** en la barra superior.
    3. Hacer que pulsar sobre un cliente en `/customers` abra directamente su ficha con su historial.
    4. Simplificar la vista de cliente eliminando los botones superiores (`Configuración`, `Resumen`, `Historial`) y renombrando `"Historial de Simulaciones Guardadas"` a `"Historial de Simulaciones"`.
    5. Pedir **múltiples alternativas arquitectónicas** para acceder al simulador al detectar que tener todo apilado en una misma pantalla resultaba confuso.
* **Directiva y resolución:**
  * Se evaluaron 3 opciones (subruta dedicada, diálogo modal ancho o pestañas) y se aprobó la **Opción A**: separar claramente la consulta (`/customers/:customerId`) de la creación de simulaciones en una ruta dedicada (`/customers/:customerId/simulate`), ampliando los tests unitarios a **32/32** y eliminando advertencias `NG8011` en compilación (`ng build`).

---

### Iteración 6 — Auditoría Final y Cierre Documental
* **Referencia:** [code-audits.md](./code-audits.md) y [taskReport.md](./taskReport.md)
* **Cómo se prompteó:**
  * Contraste sistemático de todo lo construido frente a los criterios de [task.md](../../task.md) para detectar posibles huecos técnicos o documentales antes de la entrega final.
  * Solicitud explícita de enriquecer el `README.md` con diagramas de arquitectura (backend, frontend y flujo completo extremo a extremo).
* **Resultado:**
  * Consolidación de salidas reales de pruebas (`57 passed` en backend, `32 SUCCESS` en frontend, `ruff` y `ng build` limpios), diagramas Mermaid integrados en `README.md`, commits atómicos por capa en Git y cierre de trazabilidad en `ai-workspace/quality/`.
