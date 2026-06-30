import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getInvestigacionesPublicadas: vi.fn(async () => []),
  createInvestigacion: vi.fn(async () => ({ insertId: 1 })),
  getParticipaciones: vi.fn(async () => []),
  createParticipacion: vi.fn(async data => ({
    id: 1,
    ...data,
    estado: "pendiente",
    respuesta: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
  getDatosAbiertos: vi.fn(async () => []),
  createDatoAbierto: vi.fn(async () => ({ insertId: 1 })),
  getFuentesOficiales: vi.fn(async () => []),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Observatorio Ambiental - Investigaciones", () => {
  it("permite listar investigaciones públicas sin autenticación", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.investigaciones.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("no permite crear investigaciones sin ser admin", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.investigaciones.create({
        titulo: "Test",
        slug: "test",
        resumenEjecutivo: "Test",
        contexto: "Test",
        datosOficiales: "Test",
        metodologia: "Test",
        analisisTecnico: "Test",
        proyeccion: "Test",
        escenariosAlternativos: "Test",
        limitaciones: "Test",
        conclusiones: "Test",
        fuentes: "Test",
      })
    ).rejects.toThrow();
  });
});

describe("Observatorio Ambiental - Participaciones", () => {
  it("permite crear participaciones sin autenticación", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.participaciones.create({
      categoria: "pregunta_metodologica",
      nombre: "Juan Pérez",
      email: "juan@example.com",
      asunto: "Pregunta sobre metodología",
      contenido: "¿Cómo se calculó la disponibilidad del acuífero?",
    });

    expect(result).toBeDefined();
  });

  it("no permite listar participaciones sin ser admin", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.participaciones.list()).rejects.toThrow();
  });
});

describe("Observatorio Ambiental - Datos Abiertos", () => {
  it("permite listar datos abiertos sin autenticación", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.datosAbiertos.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("no permite crear datos abiertos sin ser admin", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.datosAbiertos.create({
        titulo: "Test",
        descripcion: "Test",
        tipo: "csv",
        fuenteOficial: "CONAGUA",
      })
    ).rejects.toThrow();
  });
});

describe("Observatorio Ambiental - Fuentes Oficiales", () => {
  it("permite listar fuentes oficiales sin autenticación", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.fuentesOficiales.list();

    expect(Array.isArray(result)).toBe(true);
  });
});
