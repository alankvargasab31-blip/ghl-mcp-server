const express = require("express");
const axios = require("axios");

const API_KEY = process.env.GHL_API_KEY || "";
const LOCATION_ID = process.env.GHL_LOCATION_ID || "";
const PORT = parseInt(process.env.PORT || "3000");

if (!API_KEY || !LOCATION_ID) {
  console.error("Error: GHL_API_KEY y GHL_LOCATION_ID son requeridos.");
  process.exit(1);
}

const ghl = axios.create({
  baseURL: "https://services.leadconnectorhq.com",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

function apiError(e) {
  if (axios.isAxiosError(e)) {
    const s = e.response?.status;
    const m = e.response?.data?.message || e.message;
    if (s === 401) return `Error de autenticación: API Key inválida. ${m}`;
    if (s === 404) return `Recurso no encontrado. ${m}`;
    if (s === 422) return `Datos inválidos: ${m}`;
    if (s === 429) return `Límite de solicitudes alcanzado. Intenta de nuevo.`;
    return `Error de API (${s}): ${m}`;
  }
  return `Error: ${String(e)}`;
}

const TOOLS = [
  {
    name: "ghl_get_contacts",
    description: "Obtiene contactos de GoHighLevel. Parámetros: query (búsqueda opcional), limit (1-100, default 20), skip (paginación).",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 20 }, skip: { type: "number", default: 0 } } }
  },
  {
    name: "ghl_create_contact",
    description: "Crea un nuevo contacto. Parámetros: firstName (requerido), lastName, email, phone (con código país ej +57...), tags (array), country (default CO).",
    inputSchema: { type: "object", required: ["firstName"], properties: { firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, tags: { type: "array", items: { type: "string" } }, country: { type: "string" } } }
  },
  {
    name: "ghl_update_contact",
    description: "Actualiza un contacto existente. Parámetros: contactId (requerido), firstName, lastName, email, phone, tags.",
    inputSchema: { type: "object", required: ["contactId"], properties: { contactId: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, tags: { type: "array", items: { type: "string" } } } }
  },
  {
    name: "ghl_delete_contact",
    description: "Elimina un contacto permanentemente. Parámetros: contactId (requerido).",
    inputSchema: { type: "object", required: ["contactId"], properties: { contactId: { type: "string" } } }
  },
  {
    name: "ghl_get_pipelines",
    description: "Obtiene todos los pipelines con sus etapas.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "ghl_get_opportunities",
    description: "Obtiene oportunidades de un pipeline. Parámetros: pipelineId (requerido), stageId, status (open/won/lost/abandoned), limit.",
    inputSchema: { type: "object", required: ["pipelineId"], properties: { pipelineId: { type: "string" }, stageId: { type: "string" }, status: { type: "string" }, limit: { type: "number", default: 20 } } }
  },
  {
    name: "ghl_create_opportunity",
    description: "Crea una oportunidad. Parámetros: pipelineId, stageId, contactId, name (todos requeridos), monetaryValue, status.",
    inputSchema: { type: "object", required: ["pipelineId", "stageId", "contactId", "name"], properties: { pipelineId: { type: "string" }, stageId: { type: "string" }, contactId: { type: "string" }, name: { type: "string" }, monetaryValue: { type: "number" }, status: { type: "string", default: "open" } } }
  },
  {
    name: "ghl_get_calendars",
    description: "Obtiene todos los calendarios configurados.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "ghl_get_appointments",
    description: "Obtiene citas en un rango de fechas. Parámetros: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), calendarId (opcional).",
    inputSchema: { type: "object", required: ["startDate", "endDate"], properties: { startDate: { type: "string" }, endDate: { type: "string" }, calendarId: { type: "string" } } }
  },
  {
    name: "ghl_send_sms",
    description: "Envía un SMS a un contacto. Parámetros: contactId (requerido), message (requerido).",
    inputSchema: { type: "object", required: ["contactId", "message"], properties: { contactId: { type: "string" }, message: { type: "string" } } }
  },
  {
    name: "ghl_send_email",
    description: "Envía un email a un contacto. Parámetros: contactId (requerido), subject (requerido), body (requerido, puede ser HTML).",
    inputSchema: { type: "object", required: ["contactId", "subject", "body"], properties: { contactId: { type: "string" }, subject: { type: "string" }, body: { type: "string" } } }
  },
  {
    name: "ghl_get_conversations",
    description: "Obtiene conversaciones recientes. Parámetros: contactId (opcional), limit (default 20).",
    inputSchema: { type: "object", properties: { contactId: { type: "string" }, limit: { type: "number", default: 20 } } }
  }
];

async function executeTool(name, args) {
  try {
    switch (name) {
      case "ghl_get_contacts": {
        const params = { locationId: LOCATION_ID, limit: args.limit || 20, skip: args.skip || 0 };
        if (args.query) params.query = args.query;
        const res = await ghl.get("/contacts/", { params });
        const contacts = res.data.contacts || [];
        return { total: res.data.total || contacts.length, contactos: contacts.map(c => ({ id: c.id, nombre: `${c.firstName||""} ${c.lastName||""}`.trim(), email: c.email||"—", telefono: c.phone||"—", etiquetas: c.tags||[] })) };
      }
      case "ghl_create_contact": {
        const body = { firstName: args.firstName, locationId: LOCATION_ID, country: args.country || "CO" };
        if (args.lastName) body.lastName = args.lastName;
        if (args.email) body.email = args.email;
        if (args.phone) body.phone = args.phone;
        if (args.tags) body.tags = args.tags;
        const res = await ghl.post("/contacts/", body);
        const c = res.data.contact;
        return { mensaje: "Contacto creado exitosamente", contacto: { id: c.id, nombre: `${c.firstName} ${c.lastName||""}`.trim(), email: c.email, telefono: c.phone } };
      }
      case "ghl_update_contact": {
        const body = {};
        if (args.firstName) body.firstName = args.firstName;
        if (args.lastName) body.lastName = args.lastName;
        if (args.email) body.email = args.email;
        if (args.phone) body.phone = args.phone;
        if (args.tags) body.tags = args.tags;
        const res = await ghl.put(`/contacts/${args.contactId}`, body);
        const c = res.data.contact;
        return { mensaje: "Contacto actualizado", contacto: { id: c.id, nombre: `${c.firstName} ${c.lastName||""}`.trim() } };
      }
      case "ghl_delete_contact": {
        await ghl.delete(`/contacts/${args.contactId}`);
        return { mensaje: `Contacto ${args.contactId} eliminado exitosamente` };
      }
      case "ghl_get_pipelines": {
        const res = await ghl.get("/opportunities/pipelines", { params: { locationId: LOCATION_ID } });
        const pipelines = res.data.pipelines || [];
        return { pipelines: pipelines.map(p => ({ id: p.id, nombre: p.name, etapas: (p.stages||[]).map(s => ({ id: s.id, nombre: s.name })) })) };
      }
      case "ghl_get_opportunities": {
        const params = { location_id: LOCATION_ID, pipeline_id: args.pipelineId, limit: args.limit || 20 };
        if (args.stageId) params.pipeline_stage_id = args.stageId;
        if (args.status) params.status = args.status;
        const res = await ghl.get("/opportunities/search", { params });
        const opps = res.data.opportunities || [];
        return { total: res.data.total || opps.length, oportunidades: opps.map(o => ({ id: o.id, nombre: o.name, valor: o.monetaryValue, etapa: o.pipelineStage?.name, estado: o.status, contacto: o.contact?.name })) };
      }
      case "ghl_create_opportunity": {
        const body = { pipelineId: args.pipelineId, pipelineStageId: args.stageId, contactId: args.contactId, name: args.name, status: args.status || "open", locationId: LOCATION_ID };
        if (args.monetaryValue !== undefined) body.monetaryValue = args.monetaryValue;
        const res = await ghl.post("/opportunities/", body);
        const o = res.data.opportunity;
        return { mensaje: "Oportunidad creada", oportunidad: { id: o.id, nombre: o.name, valor: o.monetaryValue, estado: o.status } };
      }
      case "ghl_get_calendars": {
        const res = await ghl.get("/calendars/", { params: { locationId: LOCATION_ID } });
        const cals = res.data.calendars || [];
        return { calendarios: cals.map(c => ({ id: c.id, nombre: c.name, descripcion: c.description })) };
      }
      case "ghl_get_appointments": {
        const params = { locationId: LOCATION_ID, startTime: new Date(args.startDate).getTime(), endTime: new Date(args.endDate).getTime() };
        if (args.calendarId) params.calendarId = args.calendarId;
        const res = await ghl.get("/calendars/events/appointments", { params });
        const appts = res.data.appointments || [];
        return { citas: appts.map(a => ({ id: a.id, titulo: a.title, fecha: a.startTime, estado: a.appointmentStatus, contacto: a.contact?.name || a.contactId })) };
      }
      case "ghl_send_sms": {
        const res = await ghl.post("/conversations/messages", { type: "SMS", contactId: args.contactId, locationId: LOCATION_ID, message: args.message });
        return { mensaje: "SMS enviado exitosamente", id: res.data.messageId || res.data.id };
      }
      case "ghl_send_email": {
        const res = await ghl.post("/conversations/messages", { type: "Email", contactId: args.contactId, locationId: LOCATION_ID, subject: args.subject, html: args.body });
        return { mensaje: "Email enviado exitosamente", id: res.data.messageId || res.data.id };
      }
      case "ghl_get_conversations": {
        const params = { locationId: LOCATION_ID, limit: args.limit || 20 };
        if (args.contactId) params.contactId = args.contactId;
        const res = await ghl.get("/conversations/search", { params });
        const convs = res.data.conversations || [];
        return { conversaciones: convs.map(c => ({ id: c.id, contacto: c.contactName || c.fullName, ultimoMensaje: c.lastMessageBody, fecha: c.lastMessageDate })) };
      }
      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  } catch (e) {
    return { error: apiError(e) };
  }
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const { method, params, id } = req.body;

  if (method === "initialize") {
    return res.json({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "ghl-mcp-server", version: "1.0.0" } } });
  }

  if (method === "tools/list") {
    return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const result = await executeTool(name, args || {});
    return res.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
  }

  res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "ghl-mcp-server" }));

app.listen(PORT, () => console.log(`GHL MCP Server corriendo en puerto ${PORT}`));
