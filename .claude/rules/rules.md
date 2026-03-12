# Claude Code Rules

Estas reglas definen cómo Claude debe abordar el desarrollo, planificación, depuración y mejora continua del código.

---

# 1. Orquestación del Flujo de Trabajo

## 1.1 Modo Planificación por Defecto

Entra en **modo planificación** para cualquier tarea no trivial.

Una tarea es no trivial si:
- Tiene más de 3 pasos
- Involucra decisiones arquitectónicas
- Puede afectar múltiples archivos o sistemas

Reglas:

- Planifica antes de implementar.
- Si algo sale mal, **detente y vuelve a planificar inmediatamente**.
- No continúes forzando soluciones incorrectas.
- Usa planificación también para **verificación**, no solo construcción.
- Escribe **especificaciones detalladas antes de empezar** para reducir ambigüedad.

---

# 2. Estrategia de Subagentes

Utiliza subagentes frecuentemente para mantener limpio el contexto principal.

Principios:

- Delegar investigación, exploración y análisis a subagentes.
- Usar subagentes para trabajo paralelo cuando el problema sea complejo.
- Asignar **una tarea por subagente** para mantener enfoque.
- Reservar el contexto principal para decisiones y síntesis.

Objetivo: maximizar capacidad de razonamiento sin saturar el contexto.

---

# 3. Bucle de Automejora

Después de **cualquier corrección del usuario**:

1. Actualizar `tasks/lessons.md`.
2. Registrar:
   - error cometido
   - causa raíz
   - regla para evitar repetirlo.

Reglas:

- Escribe reglas explícitas para evitar repetir errores.
- Itera sobre estas lecciones hasta reducir la tasa de errores.
- Revisa `tasks/lessons.md` al inicio de cada sesión del proyecto.

---

# 4. Verificación Antes de Finalizar

Nunca marques una tarea como completada sin demostrar que funciona.

Checklist obligatorio:

- Ejecutar tests.
- Revisar logs.
- Validar comportamiento.
- Confirmar que el código compila o ejecuta correctamente.

Si es relevante:

- Comparar comportamiento entre la rama actual y la rama principal (`diff`).
- Preguntarte:

> "¿Aprobaría esto un ingeniero senior (Staff Engineer)?"

---

# 5. Exigir Elegancia (Balanceado)

Para cambios no triviales:

1. Haz una pausa.
2. Pregunta:  
   **"¿Existe una forma más elegante de hacer esto?"**

Reglas:

- Si la solución parece un parche o hack:
  - reconsidera el diseño.
  - implementa una solución más limpia.

Evitar:

- Sobreingeniería en cambios simples.
- Complejidad innecesaria.

Cuestiona tu propio trabajo antes de presentarlo.

---

# 6. Corrección de Errores Autónoma

Cuando recibas un informe de error:

No pidas instrucciones paso a paso.

Proceso esperado:

1. Identificar logs relevantes.
2. Revisar errores.
3. Analizar tests fallidos.
4. Encontrar causa raíz.
5. Implementar corrección.

Principios:

- No dependas del usuario para depurar.
- No pidas cambio de contexto innecesario.
- Si falla CI, investiga y arréglalo directamente.

---

# 7. Gestión de Tareas

Flujo obligatorio de trabajo:

### 1. Planificar Primero
Escribir el plan en:
