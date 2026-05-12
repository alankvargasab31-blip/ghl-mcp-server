# GHL MCP Server

Servidor MCP para conectar Claude con GoHighLevel CRM.

## Herramientas disponibles

- **ghl_get_contacts** — Buscar y listar contactos
- **ghl_create_contact** — Crear nuevo contacto
- **ghl_update_contact** — Actualizar contacto existente
- **ghl_delete_contact** — Eliminar contacto
- **ghl_get_pipelines** — Ver pipelines y etapas
- **ghl_get_opportunities** — Ver oportunidades
- **ghl_create_opportunity** — Crear oportunidad
- **ghl_get_calendars** — Ver calendarios
- **ghl_get_appointments** — Ver citas
- **ghl_send_sms** — Enviar SMS a contacto
- **ghl_send_email** — Enviar email a contacto
- **ghl_get_conversations** — Ver conversaciones

## Instalación

```bash
npm install
npm run build
```

## Variables de entorno

```env
GHL_API_KEY=tu-api-key-aqui
GHL_LOCATION_ID=tu-location-id-aqui
PORT=3000
TRANSPORT=http
```

## Despliegue en Railway (recomendado)

1. Crea una cuenta en [railway.app](https://railway.app)
2. Crea un nuevo proyecto → "Deploy from GitHub repo" o sube la carpeta
3. Configura las variables de entorno:
   - `GHL_API_KEY`
   - `GHL_LOCATION_ID`
   - `PORT=3000`
   - `TRANSPORT=http`
4. Railway te dará una URL pública como: `https://ghl-mcp-server.up.railway.app`
5. Tu URL del MCP será: `https://ghl-mcp-server.up.railway.app/mcp`

## Despliegue en Render

1. Crea cuenta en [render.com](https://render.com)
2. Nuevo servicio → Web Service
3. Sube el código o conecta GitHub
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Agrega las variables de entorno

## Conectar con Claude.ai

1. Ve a **Claude.ai → Configuración → Integraciones**
2. Clic en **"Añadir integración personalizada"**
3. Ingresa la URL de tu servidor: `https://tu-servidor.railway.app/mcp`
4. ¡Listo! Claude podrá gestionar tu GoHighLevel

## Ejecución local

```bash
GHL_API_KEY=tu-key GHL_LOCATION_ID=tu-location-id npm start
```
