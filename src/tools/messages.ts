import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AxiosInstance } from "axios";
import { handleApiError } from "../services/ghlClient.js";

export function registerMessageTools(server: McpServer, client: AxiosInstance, locationId: string): void {

  server.registerTool(
    "ghl_send_sms",
    {
      title: "Enviar SMS",
      description: `Envía un mensaje SMS a un contacto desde GoHighLevel.

Args:
  - contactId (string): ID del contacto destinatario
  - message (string): Texto del mensaje a enviar

Returns: Confirmación del envío con ID del mensaje.`,
      inputSchema: {
        contactId: z.string().min(1).describe("ID del contacto destinatario"),
        message: z.string().min(1).max(1600).describe("Texto del mensaje SMS"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId, message }) => {
      try {
        const res = await client.post("/conversations/messages", {
          type: "SMS", contactId, locationId, message,
        });
        return {
          content: [{ type: "text", text: JSON.stringify({ mensaje: "SMS enviado exitosamente", id: res.data.messageId || res.data.id }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_send_email",
    {
      title: "Enviar Email",
      description: `Envía un correo electrónico a un contacto desde GoHighLevel.

Args:
  - contactId (string): ID del contacto destinatario
  - subject (string): Asunto del correo
  - body (string): Cuerpo del correo (puede ser HTML)

Returns: Confirmación del envío.`,
      inputSchema: {
        contactId: z.string().min(1).describe("ID del contacto destinatario"),
        subject: z.string().min(1).describe("Asunto del correo"),
        body: z.string().min(1).describe("Cuerpo del correo, puede incluir HTML"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ contactId, subject, body }) => {
      try {
        const res = await client.post("/conversations/messages", {
          type: "Email", contactId, locationId, subject, html: body,
        });
        return {
          content: [{ type: "text", text: JSON.stringify({ mensaje: "Email enviado exitosamente", id: res.data.messageId || res.data.id }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_get_conversations",
    {
      title: "Obtener Conversaciones",
      description: `Obtiene las conversaciones recientes de la subcuenta.

Args:
  - contactId (string, opcional): Filtrar por contacto específico
  - limit (number): Cantidad de resultados (por defecto 20)

Returns: Lista de conversaciones con id, contacto, último mensaje y fecha.`,
      inputSchema: {
        contactId: z.string().optional().describe("ID del contacto para filtrar"),
        limit: z.number().int().min(1).max(100).default(20).describe("Cantidad de resultados"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ contactId, limit }) => {
      try {
        const params: Record<string, unknown> = { locationId, limit };
        if (contactId) params.contactId = contactId;
        const res = await client.get("/conversations/search", { params });
        const convs = res.data.conversations || [];
        return {
          content: [{
            type: "text", text: JSON.stringify({
              conversaciones: convs.map((c: Record<string, unknown>) => ({
                id: c.id, contacto: c.contactName || c.fullName,
                ultimoMensaje: c.lastMessageBody, fecha: c.lastMessageDate, tipo: c.type,
              }))
            }, null, 2)
          }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );
}
