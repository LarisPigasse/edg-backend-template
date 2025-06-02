// src/app.ts - EDG Backend Template
import { createServiceConfig } from "./core/config/environment";
import { createServer } from "./core/server";
import type { ServerModule } from "./core/server";
import { Request, Response, Router } from "express";

// ============================================================================
// CONFIGURAZIONE TEMPLATE
// ============================================================================

const config = createServiceConfig({
  serviceName: "EDG Backend Template",
  port: 3001,
});

// ============================================================================
// MODELLO ESEMPIO
// ============================================================================

const createExampleModel = (sequelize: any) => {
  const { DataTypes } = require("sequelize");

  const Example = sequelize.define(
    "Example",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "examples",
      indexes: [{ fields: ["name"] }, { fields: ["status"] }],
    }
  );

  return Example;
};

// ============================================================================
// ROUTER TEMPLATE
// ============================================================================

const templateRouter = Router();

// Health check template
templateRouter.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: "Template module è operativo",
      timestamp: new Date().toISOString(),
    },
  });
});

// Info template
templateRouter.get("/info", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: "EDG Backend Template",
      version: "1.0.0",
      description: "Template base riutilizzabile per microservizi EDG",
      features: [
        "Express.js con TypeScript",
        "Database configurabile (MySQL/PostgreSQL)",
        "Security middleware (Helmet, CORS, Rate Limiting)",
        "Error handling standardizzato",
        "Struttura modulare",
        "Hot reload development",
      ],
      endpoints: {
        "GET /": "Service info",
        "GET /health": "Health check",
        "GET /template/health": "Template module health",
        "GET /template/info": "Template info",
        "GET /template/examples": "Lista esempi",
        "POST /template/examples": "Crea esempio",
      },
      database: {
        supported: ["mysql", "postgres"],
        coming_soon: ["mongodb", "redis"],
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// Examples endpoints
templateRouter.get("/examples", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: "Endpoint examples - database pronto per l'uso",
      info: "Usa DB_SYNC=true per creare le tabelle",
      timestamp: new Date().toISOString(),
    },
  });
});

templateRouter.post("/examples", (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: "Campo name richiesto",
      });
      return;
    }

    const newExample = {
      id: require("uuid").v4(),
      name,
      description: description || "Esempio creato dal template",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: newExample,
      message: "Esempio creato (placeholder - implementa con il tuo database)",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Errore durante creazione esempio",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// MODULO TEMPLATE
// ============================================================================

const templateModule: ServerModule = {
  name: "template",
  path: "/template",
  router: templateRouter,
  models: [createExampleModel],
};

// ============================================================================
// AVVIO SERVER
// ============================================================================

console.log("🚀 Avvio EDG Backend Template...");

const server = createServer({
  config,
  modules: [templateModule],
});

server.start();

export default server;
