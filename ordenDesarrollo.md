Paso 1 → Base de datos + API (auth + suppliers)
Levantás PostgreSQL y Redis con docker-compose, creás las migraciones y los endpoints de auth y proveedores. 
Paso 2 → Document Processor (Python)
El parser de Excel/CSV primero (es lo más confiable). Lo probás de forma aislada: le pasás un archivo, devuelve JSON normalizado. Siguiente etapa lo conectás a la cola BullMQ.
Paso 3 → Import Pipeline completo (API + Python + Redis)
Subís un archivo desde la API → la cola lo despacha → Python lo procesa → los productos y precios se guardan en la DB. Este es el momento de verdad: si este flujo funciona, el núcleo del producto está resuelto.
Paso 4 → API restante (catálogo, cambios de precio, favoritos, markup, compras, notificaciones)
Una vez que tenés productos y precios en la DB, construís los endpoints de consulta, filtros, remarcación y listas de compra. Todo testeable sin frontend.
Paso 5 → Frontend
Con la API estable, armás la interfaz. Auth, dashboard, listado de productos, upload de archivos, listas de compra, notificaciones.
Paso 6 → PDF parser
Lo dejás para después de Excel/CSV porque es más frágil y necesita más iteración. Lo agregás al Document Processor como un parser más.