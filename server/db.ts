import { eq, desc, and, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  investigaciones,
  InsertInvestigacion,
  datosAbiertos,
  InsertDatoAbierto,
  participaciones,
  InsertParticipacion,
  visualizaciones,
  InsertVisualizacion,
  dominios,
  InsertDominio,
  fuentes,
  InsertFuente,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Investigaciones
export async function getInvestigacionesPublicadas() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(investigaciones)
    .where(eq(investigaciones.publicada, true))
    .orderBy(desc(investigaciones.publishedAt));
}

export async function getInvestigacionBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(investigaciones)
    .where(eq(investigaciones.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getInvestigacionesByDominio(dominioId: number) {
  const db = await getDb();
  if (!db) return [];

  const allInvestigaciones = await db
    .select()
    .from(investigaciones)
    .where(
      and(
        eq(investigaciones.publicada, true),
        eq(investigaciones.dominioId, dominioId)
      )
    )
    .orderBy(desc(investigaciones.publishedAt));

  return allInvestigaciones;
}

export async function getInvestigacionesRelacionadas(
  dominioId: number,
  currentSlug: string,
  limit: number = 3
) {
  const db = await getDb();
  if (!db) return [];

  const allInvestigaciones = await db
    .select({
      id: investigaciones.id,
      titulo: investigaciones.titulo,
      slug: investigaciones.slug,
      resumenEjecutivo: investigaciones.resumenEjecutivo,
      dominioId: investigaciones.dominioId,
      publishedAt: investigaciones.publishedAt,
    })
    .from(investigaciones)
    .where(
      and(
        eq(investigaciones.publicada, true),
        eq(investigaciones.dominioId, dominioId),
        ne(investigaciones.slug, currentSlug)
      )
    )
    .orderBy(desc(investigaciones.publishedAt))
    .limit(limit);

  return allInvestigaciones;
}

export async function createInvestigacion(data: InsertInvestigacion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(investigaciones).values(data);
  return result;
}

export async function updateInvestigacion(
  id: number,
  data: Partial<InsertInvestigacion>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(investigaciones).set(data).where(eq(investigaciones.id, id));
}

export async function publishInvestigacion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(investigaciones)
    .set({
      publicada: true,
      publishedAt: new Date(),
    })
    .where(eq(investigaciones.id, id));
}

// Datos Abiertos
export async function getDatosAbiertos() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(datosAbiertos)
    .orderBy(desc(datosAbiertos.createdAt));
}

export async function getDatosAbiertosByInvestigacion(investigacionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(datosAbiertos)
    .where(eq(datosAbiertos.investigacionId, investigacionId))
    .orderBy(desc(datosAbiertos.createdAt));
}

export async function createDatoAbierto(data: InsertDatoAbierto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(datosAbiertos).values(data);
  return result;
}

// Dominios
export async function getDominios() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dominios)
    .where(eq(dominios.activo, true))
    .orderBy(dominios.orden);
}

export async function getDominioById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(dominios)
    .where(eq(dominios.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createDominio(data: InsertDominio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(dominios).values(data);
  return result;
}

// Fuentes por Investigación
export async function getFuentesByInvestigacionId(investigacionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(fuentes)
    .where(eq(fuentes.investigacionId, investigacionId))
    .orderBy(fuentes.tipo);
}

export async function getFuentesOficiales() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(fuentes)
    .where(eq(fuentes.tipo, "oficial"))
    .orderBy(desc(fuentes.fechaConsulta));
}

export async function createFuente(data: InsertFuente) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(fuentes).values(data);
  return result;
}

// Participaciones Ciudadanas
export async function getParticipaciones() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(participaciones)
    .orderBy(desc(participaciones.createdAt));
}

export async function createParticipacion(data: InsertParticipacion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(participaciones).values(data);
  return result;
}

export async function updateParticipacion(
  id: number,
  data: Partial<InsertParticipacion>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(participaciones).set(data).where(eq(participaciones.id, id));
}

// Visualizaciones
export async function getVisualizaciones() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(visualizaciones)
    .orderBy(desc(visualizaciones.createdAt));
}

export async function getVisualizacionesByInvestigacion(
  investigacionId: number
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(visualizaciones)
    .where(eq(visualizaciones.investigacionId, investigacionId))
    .orderBy(desc(visualizaciones.createdAt));
}

export async function createVisualizacion(data: InsertVisualizacion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(visualizaciones).values(data);
  return result;
}
