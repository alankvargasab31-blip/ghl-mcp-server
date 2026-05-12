import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AxiosInstance } from "axios";
import { handleApiError } from "../services/ghlClient.js";

export function registerOpportunityTools(server: McpServer, client: AxiosInstance, locationId: string): void {

  server.registerTool(
    "ghl_get_pipelines",
    {
      title: "Obtener Pipelines",
      description: `Obtiene todos los pipelines (embudos de venta) de la subcuenta con sus etapas.

Returns: Lista de pipelines con id, nombre y etapas.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const res = await client.get("/opportunities/pipelines", { params: { locationId } });
        const pipelines = res.data.pipelines || [];
        return {
          content: [{ type: "text", text: JSON.stringify({ pipelines: pipelines.map((p: Record<string, unknown>) => ({ id: p.id, nombre: p.name, etapas: (p.stages as Array<Record<string, unknown>>)?.map(s => ({ id: s.id, nombre: s.name })) || [] })) }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_get_opportunities",
    {
      title: "Obtener Oportunidades",
      description: `Obtiene las oportunidades (deals) de un pipeline.

Args:
  - pipelineId (string): ID del pipeline
  - stageId (string, opcional): Filtrar por etapa específica
  - status (string, opcional): open, won, lost, abandoned
  - limit (number): Cantidad de resultados (por defecto 20)

Returns: Lista de oportunidades con id, nombre, valor, etapa y contacto.`,
      inputSchema: {
        pipelineId: z.string().min(1).describe("ID del pipeline"),
        stageId: z.string().optional().describe("ID de etapa para filtrar"),
        status: z.enum(["open", "won", "lost", "abandoned"]).optional().describe("Estado de la oportunidad"),
        limit: z.number().int().min(1).max(100).default(20).describe("Cantidad de resultados"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ pipelineId, stageId, status, limit }) => {
      try {
        const params: Record<string, unknown> = { location_id: locationId, pipeline_id: pipelineId, limit };
        if (stageId) params.pipeline_stage_id = stageId;
        if (status) params.status = status;
        const res = await client.get("/opportunities/search", { params });
        const opps = res.data.opportunities || [];
        return {
          content: [{
            type: "text", text: JSON.stringify({
              total: res.data.total || opps.length,
              oportunidades: opps.map((o: Record<string, unknown>) => ({
                id: o.id, nombre: o.name, valor: o.monetaryValue,
                etapa: (o.pipelineStage as Record<string, unknown>)?.name,
                estado: o.status,
                contacto: (o.contact as Record<string, unknown>)?.name,
              }))
            }, null, 2)
          }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  server.registerTool(
    "ghl_create_opportunity",
    {
      title: "Crear Oportunidad",
      description: `Crea una nueva oportunidad en un pipeline de GoHighLevel.

Args:
  - pipelineId (string): ID del pipeline donde crear la oportunidad
  - stageId (string): ID de la etapa inicial
  - contactId (string): ID del contacto asociado
  - name (string): Nombre de la oportunidad
  - monetaryValue (number, opcional): Valor monetario de la oportunidad
  - status (string): Estado inicial (open, won, lost, abandoned)

Returns: Datos de la oportunidad creada.`,
      inputSchema: {
        pipelineId: z.string().min(1).describe("ID del pipeline"),
        stageId: z.string().min(1).describe("ID de la etapa inicial"),
        contactId: z.string().min(1).describe("ID del contacto asociado"),
        name: z.string().min(1).describe("Nombre de la oportunidad"),
        monetaryValue: z.number().optional().describe("Valor monetario"),
        status: z.enum(["open", "won", "lost", "abandoned"]).default("open").describe("Estado inicial"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ pipelineId, stageId, contactId, name, monetaryValue, status }) => {
      try {
        const body: Record<string, unknown> = { pipelineId, pipelineStageId: stageId, contactId, name, status, locationId };
        if (monetaryValue !== undefined) body.monetaryValue = monetaryValue;
        const res = await client.post("/opportunities/", body);
        const o = res.data.opportunity;
        return {
          content: [{ type: "text", text: JSON.stringify({ mensaje: "Oportunidad creada", oportunidad: { id: o.id, nombre: o.name, valor: o.monetaryValue, estado: o.status } }, null, 2) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );
}
