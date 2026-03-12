1️⃣ Definición del Problema

Problema que se quiere resolver

Los comercios que trabajan con múltiples proveedores suelen recibir listas de precios en distintos formatos, muchas veces PDF, con estructuras poco uniformes. Esto genera problemas para:

comparar productos entre proveedores,

detectar aumentos de precio,

mantener históricos,

definir precios de venta,

preparar compras de forma ordenada.

Hoy ese trabajo suele hacerse manualmente con Excel, WhatsApp, PDFs sueltos y criterio humano, lo que consume tiempo y genera errores.

Usuario objetivo

Administrador

gestiona el sistema,

crea comercios y otros administradores,

administra accesos y datos globales.

comercio

    Crea proveedores,

    incorpora sus listas a su catálogo propio,

    analiza cambios de precios,

    define su remarcación,

    Generando propias listas de productos con sus precios acorde a pdfs excel o imagenes.

Dolor principal (pain point)

    El principal pain point es la falta de centralización y normalización de listas de precios, sumado a la dificultad de:

    interpretar PDFs distintos,

    seguir cambios históricos,

    comparar proveedores,

    calcular precios de venta,

Contexto de uso

    La app se usaría como herramienta operativa diaria o semanal para:

    importar listas nuevas,

    revisar cambios de precio,

    filtrar productos,

    definir márgenes,

    generar pedidos o listas de compra.

2️⃣ Alcance del Proyecto

Qué incluye

    Para una primera versión sólida, incluiría:

    autenticación por email y contraseña,

    roles: administrador, comercio

    gestión de proveedores y comercios,

    carga de listas de precios por proveedor,

    procesamiento de PDFs de distintos formatos,

    almacenamiento histórico de precios,

    vista de productos con filtros,

    favoritos,

    remarcación por producto o por proveedor,

    lista de compra con cantidades,

    exportación ordenada por proveedor,

    notificaciones de cambios de precio.

    Responsividad adecuada tanto a formato web como mobile.

Qué NO incluye (para evitar scope creep)

    Para evitar scope creep al inicio, dejaría fuera:

    facturación electrónica,

    stock en tiempo real,

    app móvil nativa,

    OCR avanzado para imágenes escaneadas muy malas como requisito principal,

    matching automático perfecto entre productos de distintos proveedores sin intervención humana,

    workflow complejo de aprobaciones internas,

    IA para predicción de compras o precios en primera fase.

Supuestos clave

    Cada proveedor tiene un catálogo identificable.

    Los PDFs se pueden parsear con reglas por proveedor o con una capa híbrida.

    Los comercios aceptan que la normalización de productos puede requerir reglas o revisión manual.

    El volumen inicial de productos y listas será manejable en una arquitectura SaaS estándar.

    La notificación de cambios puede resolverse inicialmente dentro de la app.

    Se generaran listados de productos por proveedor.

    El comerico generara listado de productos que consume de cada proveedor.

3️⃣ Propuesta de Solución

Enfoque general

    Capa 1: Catálogo del proveedor

    productos originales del proveedor,

    listas de precios cargadas,

    versiones e histórico,

    importación PDF/manual.

    Capa 2: Catálogo del comercio

    define remarcación propia,

    marca favoritos,

    arma compras,

    recibe alertas de cambios.

    Esto evita mezclar el dato “fuente” del proveedor con la lógica comercial del comercio.

Arquitectura sugerida (alto nivel)

Módulos principales

    Auth & Roles

        login,

        permisos,

        control de acceso por tipo de usuario.

        Gestión de usuarios y organizaciones

        administración de clientes,

        administración de proveedores,

    Catálogo de proveedores

        productos,

        versiones de lista,

        carga por PDF.

    Pipeline de importación

        subir archivo,

        extraer texto,

        interpretar según proveedor,

        detectar cambios.

        validar,

        guardar,

        detectar cambios.

    Motor de historial y cambios

        precio anterior,

        precio actual,

        porcentaje de aumento,

        fecha de cambio.

    Catálogo del cliente

        productos incorporados desde proveedores,

        multiples remarcación por producto,

        favoritos.

    Compras

        selección de productos,

        cantidades,

        agrupación por proveedor,

        exportación a texto.

    Notificaciones

        notificaciones internas en la app,

        alertas por cambios de precio,

        cambios en productos favoritos,

Stack recomendado

    Frontend: Next.js + TypeScript + tailwind

    Backend principal: Express

    Base de datos: PostgreSQL

    ORM: TypeORM

    Procesamiento documental: Python

    Jobs/colas: Redis + BullMQ

    Archivos: Firestore Google

    Auth: JWT o sesiones seguras

    Deploy: Vercel para frontend + backend en Docker

4️⃣ MVP (Producto Mínimo Viable)

    Qué debería incluir el MVP

El MVP debería enfocarse en resolver el núcleo del problema, no todo a la vez.

    MVP recomendado

        login con roles básicos,

        alta de proveedores y clientes,

        carga de Excel, CSV o PDF por proveedor,

        parser por proveedor mediante reglas configurables o hardcodeadas iniciales desde UI,

        guardado de productos y precios,

        histórico de cambios,

        vista filtrable de productos:

        proveedor,

        nombre,

        código del proveedor,

        precio anterior,

        precio actual,

        % aumento,

        favoritos,

        remarcación por producto,

        selección para compra con cantidad,

        exportación de lista agrupada por proveedor,

        notificación interna por cambios de precios.

        dashboards analíticos,

Qué se puede dejar para una segunda fase

    matching inteligente de productos equivalentes entre proveedores,

    auditoría detallada,

    recomendaciones automáticas de compra.

Riesgos técnicos del MVP

    Riesgos técnicos del MVP

    PDFs inconsistentes o escaneados.

    dificultad para unificar estructuras entre proveedores.

    matching ambiguo de productos similares.

    cambios de formato en PDFs que rompan parsers.

    cálculos históricos si no modelas bien versionado.

5️⃣ 
Modelo de Datos Inicial

Modelado de Datos Propuesto

Voy a plantearlo en 4 capas:

Identidad y acceso

Organización del negocio

Catálogo y listas de precios

Operación del comercio

1) Entidades de Identidad y Acceso
users

Usuarios que ingresan al sistema.

Campos

id

name

email

password_hash

role → admin | commerce

commerce_id nullable

is_active

created_at

updated_at

Observaciones

Un admin global puede no pertenecer a un comercio.

Un usuario tipo commerce sí pertenece a un comercio.

Más adelante podrías agregar subroles internos del comercio, pero en MVP no hace falta.

2) Entidades de Organización
commerces

Representa cada comercio/cliente de la plataforma.

Campos

id

name

internal_code o identifier

email nullable

phone nullable

is_active

created_at

updated_at

suppliers

Proveedores creados por cada comercio.

Campos

id

commerce_id

name

supplier_code

description nullable

contact_name nullable

contact_email nullable

contact_phone nullable

is_active

created_at

updated_at

Observaciones

En tu definición actual, el proveedor no es un tenant independiente, sino una entidad perteneciente al comercio.

Eso significa que dos comercios podrían tener proveedores con el mismo nombre, pero cada uno mantiene su propia versión.

3) Catálogo Fuente del Proveedor

Esta es la capa más importante.

supplier_products

Producto “original” del proveedor dentro de un comercio.

Campos

id

commerce_id

supplier_id

supplier_product_code

name

description nullable

unit nullable

brand nullable

category nullable

is_active

created_at

updated_at

Observaciones

Esta tabla representa el producto fuente tal como viene del proveedor.

Ejemplos:

código interno del proveedor,

nombre original,

descripción original.

No conviene guardar acá el precio actual “pisándolo”, porque perderías trazabilidad. El precio va en tablas versionadas.

price_lists

Cada importación/carga de lista de precios de un proveedor.

Campos

id

commerce_id

supplier_id

source_type → pdf | csv | excel | manual | image

source_file_url nullable

source_file_name nullable

uploaded_by_user_id

status → pending | processing | processed | failed | partially_processed

version_number

effective_date nullable

uploaded_at

processed_at nullable

notes nullable

created_at

updated_at

Observaciones

Acá se guarda la “cabecera” de cada lista importada.

Sirve para:

saber qué archivo originó los datos,

re-procesar,

auditar,

comparar versiones.

price_list_items

Los productos detectados en una versión concreta de una lista.

Campos

id

price_list_id

supplier_product_id

raw_name nullable

raw_description nullable

unit_cost

currency default 'ARS'

min_quantity nullable

bulk_price nullable

position_index nullable

created_at

Observaciones

Esto es un snapshot inmutable de la lista en ese momento.

Muy importante:

no sobreescribir,

no actualizar precios acá,

cada nueva lista genera nuevos items.

Esto permite calcular:

precio anterior,

precio actual,

% de aumento,

evolución histórica.

supplier_product_price_history (opcional pero recomendable)

Historial normalizado para consultas rápidas.

Campos

id

commerce_id

supplier_id

supplier_product_id

price_list_id

unit_cost

previous_unit_cost nullable

price_change_percentage nullable

effective_date nullable

recorded_at

Observaciones

Esto puede:

derivarse desde price_list_items, o

materializarse para acelerar reportes.

Si quieres simplicidad inicial, puedes no crearla y calcular desde price_list_items.
Si quieres performance y reporting más limpio, sí conviene.

import_jobs

Seguimiento técnico del procesamiento del archivo.

Campos

id

price_list_id

job_type → parse_document | normalize | detect_changes

status → queued | running | completed | failed

started_at nullable

finished_at nullable

error_message nullable

meta_json nullable

Observaciones

Muy útil si usarás Python + BullMQ + Redis.

import_parse_results (opcional)

Guardar salida cruda/intermedia del parser.

Campos

id

price_list_id

parser_name

parser_version

raw_output_json

normalized_output_json nullable

created_at

Observaciones

Esto sirve mucho cuando:

cambian formatos de PDFs,

el parser falla,

quieres depurar interpretaciones.

No es estrictamente obligatorio para MVP, pero sí muy útil.

4) Catálogo Operativo del Comercio

Acá vive la lógica propia del comercio.

commerce_products

Producto operativo que el comercio “adopta” desde productos de proveedores.

Campos

id

commerce_id

name

description nullable

internal_sku nullable

notes nullable

is_active

created_at

updated_at

Observaciones

Esta tabla te conviene mucho si quieres que el comercio pueda tener su propio catálogo interno.

Ejemplo:

Proveedor A: “Azucar comun x 1kg”

Proveedor B: “Azúcar 1000gr”

El comercio puede decidir que ambos pertenecen a un mismo producto interno:

“Azúcar 1kg”

Esto además deja preparada la base para matching manual.

commerce_product_supplier_links

Vincula productos internos del comercio con productos concretos de proveedores.

Campos

id

commerce_id

commerce_product_id

supplier_product_id

is_favorite

is_active

created_at

updated_at

Observaciones

Esta es una tabla clave.

Te permite:

comparar el mismo producto entre proveedores,

marcar favoritos a nivel vínculo,

mantener catálogo interno sin perder el dato fuente.

markup_rules

Reglas de remarcación.

Campos

id

commerce_id

scope_type → supplier | supplier_product | commerce_product

supplier_id nullable

supplier_product_id nullable

commerce_product_id nullable

markup_percentage

is_active

created_at

updated_at

Observaciones

Como pediste múltiples remarcaciones por producto y también por proveedor, esta tabla conviene más que guardar un solo porcentaje fijo.

Con esta estructura puedes soportar:

remarcación general por proveedor,

remarcación específica por producto del proveedor,

remarcación por producto interno del comercio.

Regla sugerida de precedencia

remarcación específica por supplier_product

remarcación por commerce_product

remarcación general por supplier

Compras

6) Compras
purchase_lists

Lista de compra creada por el comercio.

Campos

id

commerce_id

created_by_user_id

name

status → draft | exported | archived

notes nullable

created_at

updated_at
-----------------
purchase_list_items

Ítems de la lista de compra.

Campos

id

purchase_list_id

supplier_id

supplier_product_id

commerce_product_id nullable

quantity

estimated_unit_cost nullable

estimated_total_cost nullable

notes nullable

sort_order nullable

created_at

----------------

notifications

Notificaciones internas de la app.

Campos

id

commerce_id

user_id nullable

type → price_change | favorite_price_change | import_finished | import_failed

title

message

is_read

reference_type nullable

reference_id nullable

created_at

read_at nullable


reference_type/reference_id pueden apuntar a:

supplier_product

price_list

purchase_list


----------------

price_change_events

Evento normalizado de cambio de precio.

Campos

id

commerce_id

supplier_id

supplier_product_id

old_price

new_price

change_percentage

detected_in_price_list_id

created_at

Observaciones

Esta tabla hace más fácil:

disparar notificaciones,

mostrar historiales,

construir dashboards.

-------------------

8) Relaciones principales
Relación estructural

Un commerce tiene muchos users

Un commerce tiene muchos suppliers

Un supplier tiene muchos supplier_products

Un supplier tiene muchas price_lists

Una price_list tiene muchos price_list_items

Relación operativa

Un commerce tiene muchos commerce_products

Un commerce_product puede vincularse con muchos supplier_products

Un supplier_product puede estar vinculado a uno o muchos commerce_products según tu negocio
aunque idealmente al inicio conviene controlarlo para evitar caos

Compras

Un purchase_list tiene muchos purchase_list_items

Cada item referencia un supplier_product

Notificaciones

Un price_change_event puede originar muchas notifications

9) Modelo conceptual resumido
Capa fuente

suppliers
→ supplier_products
→ price_lists
→ price_list_items

Capa comercio

commerce_products
→ commerce_product_supplier_links
→ markup_rules
→ purchase_lists

Ese desacople es correcto y muy importante.

10) Decisiones de modelado importantes
A. No guardar “el precio actual” fijo en supplier_products

Porque el precio cambia por versión de lista.
El precio actual debe salir de:

la última price_list procesada,

o una vista/materialización.

B. Separar supplier_product de commerce_product

Esto te evita un problema enorme a futuro:
mezclar dato importado con dato comercial interno.

C. La remarcación no debe vivir como un único campo en producto

Porque tú ya definiste:

remarcación por proveedor,

remarcación por producto,

incluso múltiples estrategias.

Entonces conviene una tabla de reglas.

D. Las listas importadas deben ser inmutables

Cada importación crea una nueva versión.
No se corrigen “pisando” precios anteriores.

11) Versión mínima recomendada para MVP

Si quieres bajar esto al mínimo realmente útil, usaría estas tablas sí o sí:

Núcleo

users

commerces

suppliers

supplier_products

price_lists

price_list_items

Operación

commerce_products

commerce_product_supplier_links

markup_rules

Compras y alertas

purchase_lists

purchase_list_items

notifications

Técnicas

import_jobs


6️⃣ Riesgos del Proyecto 

Riesgos del Proyecto
Técnicos

PDFs heterogéneos y poco estructurados,

documentos escaneados que requieren OCR,

error en extracción de tablas,

mapeo incorrecto de productos,

cálculo equivocado de aumentos si no hay versión previa válida,

consultas lentas con mucho historial.

De negocio

algunos proveedores quizá no colaboren con formatos consistentes,

el cliente puede esperar automatización total donde habrá casos manuales,

si no se resuelve bien la importación, la propuesta de valor cae mucho.

De producto

demasiadas funciones desde el inicio,

interfaz compleja si mezclas gestión, análisis y compras en una sola vista,

confusión entre “producto proveedor” y “producto cliente”.

De escalabilidad

más proveedores implica más parsers y mantenimiento,

más listas históricas implica más volumen de datos,

más notificaciones implica necesidad de colas y reglas de agregación.


7️⃣ Métricas de Éxito
KPIs técnicos

tasa de éxito de importación por PDF,

tiempo promedio de procesamiento por archivo,

porcentaje de productos parseados correctamente,

latencia de búsquedas y filtros,

tasa de errores en jobs de importación.

KPIs de negocio

cantidad de listas procesadas por mes,

cantidad de clientes activos,

cantidad de proveedores activos,

frecuencia de uso semanal,

cantidad de productos marcados/comprados por cliente.

Métricas de validación

tiempo ahorrado respecto al proceso manual,

porcentaje de listas que ya no requieren Excel externo,

precisión percibida de los cambios de precio,

recurrencia de uso para revisar aumentos,

conversión de clientes que usan favoritos y listas de compra.
8️⃣ Preguntas Criticas 

Estas son las preguntas que más impacto tienen antes de empezar:

Los PDFs de proveedores son texto real o muchos son escaneados como imagen?
Existen de los dos, tambien algunos que mesclan ambas.

Quieres que el sistema detecte automáticamente productos equivalentes entre distintos proveedores, o solo compararlos si el usuario los vincula manualmente?
Compararlos si el usuario los vincula manualmente

El precio por cantidad es escalonado?
El precio es unico

La remarcación por producto debe poder heredarse por categoría/proveedor además de ser individual?
Si se puede aumentar todos los productos de un proveedor manualmente.

La notificación de cambios debe ser en tiempo real, resumen diario, dentro de la app o también por email/WhatsApp?
Unicamente dentro de la misma app

El cliente puede editar el nombre interno del producto, o debe mantener siempre el nombre original del proveedor?
El cliente puede editar el nombre del producto de su lista, pero respetara el id original.

Habrá categorías de productos?
Si se requiere categoria de producto para las listas de los comercios, se colocan manualmente 

La lista de compra exportada en qué formato la necesitas?
Texto para whatsapp 

Un cliente puede compartir su cuenta con varios usuarios internos?
Una cuenta por comercio 

Habrá precios en distintas monedas o impuestos incluidos/excluidos?
Por ahora solo pesos

Necesitas auditoría de quién cambió qué dato?
No , usuario unico

9️Enfoque recomendado para arrancar



Primera versión

usuarios y roles,

proveedores,

carga PDF,

parser por proveedor,

productos + histórico,

filtros,

favoritos,

remarcación,

lista de compra exportable.

notificaciones automáticas,

panel del proveedor,

reglas configurables de parsing,

mejores comparaciones entre proveedores,

categorías y márgenes masivos.

