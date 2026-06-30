import { describe, it, expect, vi } from "vitest";

const investigacionFixture = {
  id: 7,
  numero: 7,
  dominioId: 1,
  titulo: "Análisis estructural del presupuesto municipal de Choix 2020-2026",
  slug: "analisis-estructural-presupuesto-municipal-choix-2020-2026",
  resumenEjecutivo: "Resumen de prueba",
  definicionSistema: "Definición de sistema de prueba",
  tablaMaestra: "Tabla maestra de prueba",
  supuestos: "Supuestos de prueba",
  modelo: "Modelo de prueba",
  escenarios: "Escenarios de prueba",
  brechas: "Brechas de prueba",
  conclusion: "Conclusión de prueba",
  impactoComunitario: null,
  lineasAccion: null,
  metadataJson: null,
  escenariosConfig: null,
  indicesCalculados: null,
  imagenesSatelitales: null,
  versionProtocolo: "1.0",
  fechaCierreSemantico: null,
  supuestosEstructurados: null,
  indiceRobustez: "0.91",
  publicada: true,
  autorId: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
};

vi.mock("./db", () => ({
  getInvestigacionBySlug: vi.fn(async (slug: string) =>
    slug === investigacionFixture.slug ? investigacionFixture : undefined
  ),
  getFuentesByInvestigacionId: vi.fn(async () => [
    {
      id: 1,
      investigacionId: investigacionFixture.id,
      tipo: "oficial",
      titulo: "Presupuesto municipal",
      autor: null,
      institucion: "Ayuntamiento de Choix",
      url: "https://example.com/presupuesto",
      fechaPublicacion: new Date("2026-01-01T00:00:00.000Z"),
      fechaConsulta: new Date("2026-01-02T00:00:00.000Z"),
      notas: null,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  ]),
  getDominioById: vi.fn(async () => ({
    id: 1,
    nombre: "Finanzas Públicas",
    slug: "finanzas",
    descripcion: "Dominio de finanzas públicas",
    icono: null,
    color: null,
    variablesTemplate: null,
    indicesConfig: null,
    escenariosBase: null,
    requiereSatelital: false,
    tipoIndice: null,
    activo: true,
    orden: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Exportación de Datos Abiertos", () => {
  it("debe exportar investigación en formato JSON con metadata completa", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Usar slug de investigación real (#7 - Finanzas)
    const result = await caller.investigaciones.exportJSON({
      slug: "analisis-estructural-presupuesto-municipal-choix-2020-2026",
    });

    // Verificar estructura de respuesta
    expect(result).toHaveProperty("investigacion");
    expect(result).toHaveProperty("fuentes");
    expect(result).toHaveProperty("metadata");

    // Verificar campos de investigación
    expect(result.investigacion).toHaveProperty("id");
    expect(result.investigacion).toHaveProperty("titulo");
    expect(result.investigacion).toHaveProperty("slug");
    expect(result.investigacion).toHaveProperty("dominio");
    expect(result.investigacion).toHaveProperty("resumenEjecutivo");
    expect(result.investigacion).toHaveProperty("definicionSistema");
    expect(result.investigacion).toHaveProperty("tablaMaestra");
    expect(result.investigacion).toHaveProperty("supuestos");
    expect(result.investigacion).toHaveProperty("modelo");
    expect(result.investigacion).toHaveProperty("escenarios");
    expect(result.investigacion).toHaveProperty("brechas");
    expect(result.investigacion).toHaveProperty("conclusion");
    expect(result.investigacion).toHaveProperty("indiceRobustez");
    expect(result.investigacion).toHaveProperty("publishedAt");

    // Verificar que fuentes es un array
    expect(Array.isArray(result.fuentes)).toBe(true);

    // Verificar metadata de exportación
    expect(result.metadata).toHaveProperty("exportadoEn");
    expect(result.metadata).toHaveProperty("version");
    expect(result.metadata).toHaveProperty("licencia");
    expect(result.metadata.version).toBe("1.0");
    expect(result.metadata.licencia).toBe("Datos Abiertos - Dominio Público");
  });

  it("debe exportar investigación en formato CSV con secciones correctas", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Usar slug de investigación real (#7 - Finanzas)
    const result = await caller.investigaciones.exportCSV({
      slug: "analisis-estructural-presupuesto-municipal-choix-2020-2026",
    });

    // Verificar estructura de respuesta
    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toBe(
      "analisis-estructural-presupuesto-municipal-choix-2020-2026.csv"
    );

    // Verificar que CSV contiene las secciones esperadas
    expect(result.csv).toContain("METADATA DE INVESTIGACIÓN");
    expect(result.csv).toContain("FUENTES PRIMARIAS");
    expect(result.csv).toContain("METADATA DE EXPORTACIÓN");

    // Verificar que CSV contiene campos clave
    expect(result.csv).toContain("Título");
    expect(result.csv).toContain("Dominio");
    expect(result.csv).toContain("Índice de Robustez Metodológica");
    expect(result.csv).toContain("Fecha de Publicación");
    expect(result.csv).toContain("Licencia,Datos Abiertos - Dominio Público");
  });

  it("debe lanzar error NOT_FOUND para slug inexistente en exportJSON", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.investigaciones.exportJSON({ slug: "investigacion-inexistente" })
    ).rejects.toThrow("Investigación no encontrada");
  });

  it("debe lanzar error NOT_FOUND para slug inexistente en exportCSV", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.investigaciones.exportCSV({ slug: "investigacion-inexistente" })
    ).rejects.toThrow("Investigación no encontrada");
  });
});
