// src/core/server.ts - Versione semplificata funzionante
import express, { Application, Request, Response, Router } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ServiceConfig, isDevelopment } from "./config/environment";
import { DatabaseManager } from "./config/database";

export interface ServerModule {
  name: string;
  path: string;
  router: Router;
  models?: Array<(sequelize: any) => any>;
  associations?: (models: any[]) => void;
}

export interface ServerOptions {
  config: ServiceConfig;
  modules?: ServerModule[];
  customMiddleware?: Array<(app: Application) => void>;
}

export class EDGServer {
  private app: Application;
  private config: ServiceConfig;
  private database: DatabaseManager;
  private modules: ServerModule[];

  constructor(options: ServerOptions) {
    this.app = express();
    this.config = options.config;
    this.database = new DatabaseManager(this.config);
    this.modules = options.modules || [];

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    // Custom middleware per servizi specifici
    if (options.customMiddleware) {
      options.customMiddleware.forEach((middleware) => {
        middleware(this.app);
        console.log("🔧 Custom middleware applicato");
      });
    }
  }

  private setupMiddleware(): void {
    console.log("🛡️  Setup middleware sicurezza...");

    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: isDevelopment(this.config) ? false : undefined,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Permetti richieste senza origin (Postman, mobile apps, etc.)
          if (!origin) return callback(null, true);

          if (this.config.cors.origins.includes(origin)) {
            callback(null, true);
          } else {
            console.warn(`🚫 CORS: Origine non consentita: ${origin}`);
            callback(new Error("Non consentito da CORS"));
          }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );

    // Rate limiting globale
    const globalLimiter = rateLimit({
      windowMs: this.config.security.rateLimitWindow * 60 * 1000,
      max: this.config.security.rateLimitMaxAttempts,
      message: {
        success: false,
        error: "Troppe richieste da questo IP, riprova più tardi",
        retryAfter: this.config.security.rateLimitWindow * 60,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use(globalLimiter);

    // Body parsing con limiti ragionevoli
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging in development
    if (isDevelopment(this.config)) {
      this.app.use((req, res, next) => {
        console.log(`📝 ${req.method} ${req.path}`);
        next();
      });
    }
  }

  private setupRoutes(): void {
    console.log("🛣️  Setup routes...");

    // Root endpoint con info servizio
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          message: `${this.config.serviceName} - Template EDG Backend`,
          service: this.config.serviceName,
          version: "1.0.0",
          environment: this.config.nodeEnv,
          modules: this.modules.map((m) => ({
            name: m.name,
            path: m.path,
          })),
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Health check con stato database
    this.app.get("/health", async (req: Request, res: Response) => {
      try {
        const dbHealth = await this.database.healthCheck();

        const response = {
          success: dbHealth.status === "healthy",
          data: {
            status: dbHealth.status,
            service: this.config.serviceName,
            database: dbHealth.details,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
        };

        res.status(dbHealth.status === "healthy" ? 200 : 503).json(response);
      } catch (error) {
        res.status(503).json({
          success: false,
          data: {
            status: "error",
            service: this.config.serviceName,
            error: "Health check fallito",
            timestamp: new Date().toISOString(),
          },
        });
      }
    });

    // Registra moduli del servizio
    this.modules.forEach((module) => {
      console.log(`📦 Registrando modulo: ${module.name} → ${module.path}`);
      this.app.use(module.path, module.router);
    });
  }

  private setupErrorHandling(): void {
    // 404 handler - pattern sicuro (NO wildcards)
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: `Endpoint ${req.method} ${req.originalUrl} non trovato`,
        service: this.config.serviceName,
        availableEndpoints: ["GET /", "GET /health", ...this.modules.map((m) => `${m.path}/*`)],
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: any) => {
      console.error("❌ Errore non gestito:", error);

      const isDev = isDevelopment(this.config);

      res.status(error.status || 500).json({
        success: false,
        error: isDev ? error.message : "Errore interno del server",
        service: this.config.serviceName,
        ...(isDev && { stack: error.stack }),
        timestamp: new Date().toISOString(),
      });
    });
  }

  async initializeDatabase(): Promise<boolean> {
    console.log("💾 Inizializzazione database...");

    // Test connessione
    const connected = await this.database.testConnection();
    if (!connected) return false;

    // Registra modelli dei moduli
    this.modules.forEach((module) => {
      if (module.models) {
        module.models.forEach((modelInit) => {
          this.database.registerModel(modelInit);
        });
      }
    });

    // Registra associazioni dei moduli
    this.modules.forEach((module) => {
      if (module.associations) {
        this.database.registerAssociations(module.associations);
      }
    });

    // Sync se richiesto esplicitamente
    if (process.env.DB_SYNC === "true") {
      console.log("🔄 Sincronizzazione database richiesta (DB_SYNC=true)...");
      const synced = await this.database.syncDatabase();
      if (synced) {
        console.log("✅ Database sincronizzato con successo");
        console.log("💡 Per evitare sync ripetuti, rimuovi DB_SYNC=true dal .env");
      }
      return synced;
    } else {
      console.log("⏭️  Sync database saltata (aggiungi DB_SYNC=true per sincronizzare)");
      return true;
    }
  }

  async start(): Promise<void> {
    try {
      console.log(`🚀 Avvio ${this.config.serviceName}...`);

      // Inizializza database
      const dbReady = await this.initializeDatabase();
      if (!dbReady) {
        console.error("❌ Impossibile avviare il servizio senza database");
        console.error("💡 Verifica le credenziali database nel file .env");
        process.exit(1);
      }

      // Avvia server HTTP
      this.app.listen(this.config.port, () => {
        console.log(`\n✅ ${this.config.serviceName} avviato con successo!`);
        console.log(`🌐 Server: http://localhost:${this.config.port}`);
        console.log(`📊 Database: ${this.config.database.name}@${this.config.database.host}`);
        console.log(`📦 Moduli: ${this.modules.map((m) => m.name).join(", ") || "nessuno"}`);
        console.log(`🏁 Pronto per ricevere richieste!\n`);
      });

      // Graceful shutdown handlers
      process.on("SIGTERM", () => this.shutdown("SIGTERM"));
      process.on("SIGINT", () => this.shutdown("SIGINT"));
    } catch (error) {
      console.error("❌ Errore critico durante l'avvio:", error);
      process.exit(1);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    console.log(`\n🔄 Shutdown graceful in corso (${signal})...`);

    try {
      await this.database.close();
      console.log("✅ Servizio terminato correttamente");
      process.exit(0);
    } catch (error) {
      console.error("❌ Errore durante shutdown:", error);
      process.exit(1);
    }
  }

  // Getters per development/testing
  getApp(): Application {
    return this.app;
  }

  getDatabase(): DatabaseManager {
    return this.database;
  }

  getConfig(): ServiceConfig {
    return this.config;
  }
}

// Factory function per creare server
export const createServer = (options: ServerOptions): EDGServer => {
  return new EDGServer(options);
};
