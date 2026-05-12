import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AxiosInstance } from "axios";
import { handleApiError } from "../services/ghlClient.js";

export function registerCalendarTools(server: McpServer, client: AxiosInstance, locationId: string): void {

  server.registerTool(
    "ghl_get_calendars",
    {
      title: "Obtener Calendarios",
      description: `Obtiene todos los calendarios configurados en la subcuenta.

Returns: Lista de calendarios con id, nombre y descripción.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const res = await client.get("/calendars/", { params: { locationId } });
        const calendars = res.data.calendars || [];
        return {
          content: [{ type: "text", text: JSON.stringify({ calendarios: calendars.map((c: Record<string, unknown>) => ({ id: c.id, nombre: c.name, descripcion: c.description })) }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_get_appointments",
    {
      title: "Obtener Citas",
    description: `Obtiene las citas programadas en un rango de fechas.

Args:
  - calendarId (string, opcional): ID del calendario específico
  - startDate (string): Fecha inicio en formato YYYY-MM-DD
  - endDate (string): Fecha fin en formato YYYY-MM-DD

Returns: Lista de citas con id, título, fecha, contacto y estado.`,
      inputSchema: {
        calendarId: z.string().optional().describe("ID del calendario, omitir para todos"),
        startDate: z.string().describe("Fecha inicio YYYY-MM-DD"),
        endDate: z.string().describe("Fecha fin YYYY-MM-DD"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ calendarId, startDate, endDate }) => {
      try {
        const params: Record<string, unknown> = { locationId, startTime: new Date(startDate).getTime(), endTime: new Date(endDate).getTime() };
        if (calendarId) params.calendarId = calendarId;
        const res = await client.get("/calendars/events/appointments", { params });
        const appts = res.data.appointments || [];
        return {
          content: [{
            type: "text", text: JSON.stringify({
              citas: appts.map((a: Record<string, unknown>) => ({
                id: a.id, titulo: a.title, fecha: a.startTime, estado: a.appointmentStatus,
                contacto: (a.contact as Record<string, unknown>)?.name || a.contactId,
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
