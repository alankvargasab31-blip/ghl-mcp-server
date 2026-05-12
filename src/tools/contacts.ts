import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AxiosInstance } from "axios";
import { handleApiError } from "../services/ghlClient.js";

export function registerContactTools(server: McpServer, client: AxiosInstance, locationId: string): void {

  server.registerTool(
    "ghl_get_contacts",
    {
      title: "Obtener Contactos",
      description: `Obtiene la lista de contactos de la subcuenta de GoHighLevel.
Permite buscar por nombre, email o teléfono, y paginar resultados.

Args:
  - query (string, opcional): Texto para buscar en nombre, email o teléfono
  - limit (number): Cantidad de resultados (1-100, por defecto 20)
  - skip (number): Resultados a omitir para paginación (por defecto 0)

Returns: Lista de contactos con id, nombre, email, teléfono, etiquetas y fecha de creación.`,
      inputSchema: {
        query: z.string().optional().describe("Texto para buscar contacto por nombre, email o teléfono"),
        limit: z.number().int().min(1).max(100).default(20).describe("Cantidad máxima de resultados"),
        skip: z.number().int().min(0).default(0).describe("Resultados a omitir para paginación"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ query, limit, skip }) => {
      try {
        const params: Record<string, unknown> = { locationId, limit, skip };
        if (query) params.query = query;
        const res = await client.get("/contacts/", { params });
        const contacts = res.data.contacts || [];
        const total = res.data.total || contacts.length;
        const formatted = contacts.map((c: Record<string, unknown>) => ({
          id: c.id,
          nombre: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Sin nombre",
          email: c.email || "—",
          telefono: c.phone || "—",
          etiquetas: c.tags || [],
          creado: c.dateAdded,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ total, mostrados: contacts.length, contactos: formatted }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_create_contact",
    {
      title: "Crear Contacto",
      description: `Crea un nuevo contacto en GoHighLevel.

Args:
  - firstName (string): Nombre del contacto
  - lastName (string, opcional): Apellido del contacto
  - email (string, opcional): Correo electrónico
  - phone (string, opcional): Teléfono (incluir código de país, ej: +573001234567)
  - tags (array, opcional): Etiquetas a asignar
  - country (string, opcional): Código de país (ej: CO, US, MX)
  - source (string, opcional): Fuente del contacto

Returns: Datos del contacto creado incluyendo su ID.`,
      inputSchema: {
        firstName: z.string().min(1).describe("Nombre del contacto"),
        lastName: z.string().optional().describe("Apellido del contacto"),
        email: z.string().email().optional().describe("Correo electrónico"),
        phone: z.string().optional().describe("Teléfono con código de país, ej: +573001234567"),
        tags: z.array(z.string()).optional().describe("Etiquetas para el contacto"),
        country: z.string().optional().default("CO").describe("Código de país ISO (ej: CO, US, MX)"),
        source: z.string().optional().describe("Fuente del contacto (ej: website, referido)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ firstName, lastName, email, phone, tags, country, source }) => {
      try {
        const body: Record<string, unknown> = { firstName, locationId, country: country || "CO" };
        if (lastName) body.lastName = lastName;
        if (email) body.email = email;
        if (phone) body.phone = phone;
        if (tags) body.tags = tags;
        if (source) body.source = source;
        const res = await client.post("/contacts/", body);
        const c = res.data.contact;
        return {
          content: [{ type: "text", text: JSON.stringify({ mensaje: "Contacto creado exitosamente", contacto: { id: c.id, nombre: `${c.firstName} ${c.lastName || ""}`.trim(), email: c.email, telefono: c.phone, etiquetas: c.tags } }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_update_contact",
    {
      title: "Actualizar Contacto",
      description: `Actualiza los datos de un contacto existente en GoHighLevel.

Args:
  - contactId (string): ID del contacto a actualizar
  - firstName (string, opcional): Nuevo nombre
  - lastName (string, opcional): Nuevo apellido
  - email (string, opcional): Nuevo email
  - phone (string, opcional): Nuevo teléfono
  - tags (array, opcional): Nuevas etiquetas (reemplaza las anteriores)

Returns: Datos actualizados del contacto.`,
      inputSchema: {
        contactId: z.string().min(1).describe("ID del contacto a actualizar"),
        firstName: z.string().optional().describe("Nuevo nombre"),
        lastName: z.string().optional().describe("Nuevo apellido"),
        email: z.string().email().optional().describe("Nuevo email"),
        phone: z.string().optional().describe("Nuevo teléfono con código de país"),
        tags: z.array(z.string()).optional().describe("Nuevas etiquetas"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId, firstName, lastName, email, phone, tags }) => {
      try {
        const body: Record<string, unknown> = {};
        if (firstName) body.firstName = firstName;
        if (lastName) body.lastName = lastName;
        if (email) body.email = email;
        if (phone) body.phone = phone;
        if (tags) body.tags = tags;
        const res = await client.put(`/contacts/${contactId}`, body);
        const c = res.data.contact;
        return {
          content: [{ type: "text", text: JSON.stringify({ mensaje: "Contacto actualizado", contacto: { id: c.id, nombre: `${c.firstName} ${c.lastName || ""}`.trim(), email: c.email, telefono: c.phone } }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_delete_contact",
    {
      title: "Eliminar Contacto",
      description: `Elimina un contacto de GoHighLevel de forma permanente.

Args:
  - contactId (string): ID del contacto a eliminar

Returns: Confirmación de eliminación.`,
      inputSchema: {
        contactId: z.string().min(1).describe("ID del contacto a eliminar"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId }) => {
      try {
        await client.delete(`/contacts/${contactId}`);
        return { content: [{ type: "text", text: JSON.stringify({ mensaje: `Contacto ${contactId} eliminado exitosamente` }, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );
}
