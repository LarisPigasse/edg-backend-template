#!/usr/bin/env node
// scripts/create-service.js - Generatore automatico servizi EDG

const fs = require("fs");
const path = require("path");

// Parsing argomenti
const args = process.argv.slice(2);
const serviceName = args[0];
const dbType = args.find((arg) => arg.startsWith("--db="))?.split("=")[1] || "mysql";

if (!serviceName) {
  console.error("❌ Specifica il nome del servizio");
  console.log("");
  console.log("📋 Uso:");
  console.log("  npm run create-service <nome-servizio> [--db=mysql|postgres]");
  console.log("");
  console.log("📚 Esempi:");
  console.log("  npm run create-service auth-service");
  console.log("  npm run create-service orders-service --db=postgres");
  process.exit(1);
}

// Validazione nome servizio
if (!serviceName.match(/^[a-z][a-z0-9-]*[a-z0-9]$/)) {
  console.error("❌ Nome servizio non valido");
  console.log("💡 Usa solo lettere minuscole, numeri e trattini (es: auth-service)");
  process.exit(1);
}

// Validazione database type
const supportedDbs = ["mysql", "postgres"];
if (!supportedDbs.includes(dbType)) {
  console.error(`❌ Database type non supportato: ${dbType}`);
  console.log(`💡 Supportati: ${supportedDbs.join(", ")}`);
  process.exit(1);
}

// Configurazioni servizio
const getServiceConfig = (name, db) => {
  const portMap = {
    "auth-service": 3001,
    "orders-service": 3002,
    "partners-service": 3003,
    "clients-service": 3004,
    "reports-service": 3005,
  };

  const port = portMap[name] || 3010 + Math.floor(Math.random() * 90);
  const dbName = `edg_${name.replace("-service", "")}`;
  const defaultPort = db === "postgres" ? 5432 : 3306;

  return { port, dbName, defaultPort };
};

const { port, dbName, defaultPort } = getServiceConfig(serviceName, dbType);
const servicePath = path.join(process.cwd(), "..", serviceName);

console.log("🚀 Generazione nuovo servizio EDG...");
console.log(`📦 Servizio: ${serviceName}`);
console.log(`📊 Database: ${dbType} (${dbName})`);
console.log(`🔌 Porta: ${port}`);
console.log(`📁 Path: ${servicePath}`);
console.log("");

// Verifica directory non esistente
if (fs.existsSync(servicePath)) {
  console.error(`❌ Directory ${serviceName} già esistente`);
  process.exit(1);
}

try {
  // Crea directory principale
  fs.mkdirSync(servicePath, { recursive: true });

  // Struttura directory
  const dirs = ["src/core/config", "src/modules", "scripts", "tests"];

  dirs.forEach((dir) => {
    fs.mkdirSync(path.join(servicePath, dir), { recursive: true });
  });

  // Copia file core dal template
  const coreFiles = ["src/core/config/environment.ts", "src/core/config/database.ts", "src/core/server.ts"];

  coreFiles.forEach((file) => {
    const sourcePath = path.join(__dirname, "..", file);
    const destPath = path.join(servicePath, file);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`📄 ✅ ${file}`);
    } else {
      console.warn(`⚠️  File non trovato: ${file}`);
    }
  });

  // Genera app.ts specifico per il servizio
  const appTemplate = `// src/app.ts - ${serviceName}
import { createServiceConfig } from './core/config/environment';
import { createServer } from './core/server';
import type { ServerModule } from './core/server';
import { Request, Response, Router } from 'express';

// ============================================================================
// CONFIGURAZIONE SERVIZIO
// ============================================================================

const config = createServiceConfig({
  serviceName: '${serviceName}',
  port: ${port},
});

// ============================================================================
// MODELLI (DA IMPLEMENTARE)
// ============================================================================

const createMainModel = (sequelize: any) => {
  const { DataTypes } = require('sequelize');
  
  const MainModel = sequelize.define('MainModel', {
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
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      defaultValue: 'pending',
    },
  }, {
    tableName: 'main_models',
    indexes: [
      { fields: ['name'] },
      { fields: ['status'] },
    ],
  });

  return MainModel;
};

// ============================================================================
// ROUTE BASE
// ============================================================================

const mainRouter = Router();

mainRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: '${serviceName} è operativo',
      timestamp: new Date().toISOString(),
    },
  });
});

mainRouter.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: '${serviceName}',
      message: 'Servizio pronto per l\\'implementazione',
      database: '${dbType}',
      port: ${port},
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// MODULO PRINCIPALE
// ============================================================================

const mainModule: ServerModule = {
  name: 'main',
  path: '/api',
  router: mainRouter,
  models: [createMainModel],
};

// ============================================================================
// AVVIO SERVER
// ============================================================================

const server = createServer({
  config,
  modules: [mainModule],
});

server.start();

export default server;
`;

  fs.writeFileSync(path.join(servicePath, "src/app.ts"), appTemplate);

  // Package.json
  const packageJson = {
    name: `@edg/${serviceName}`,
    version: "1.0.0",
    description: `EDG ${serviceName}`,
    main: "dist/app.js",
    scripts: {
      dev: "nodemon --exec ts-node src/app.ts",
      build: "tsc",
      start: "node dist/app.js",
      "db:sync": "DB_SYNC=true npm run dev",
    },
    dependencies: {
      express: "^5.1.0",
      cors: "^2.8.5",
      helmet: "^8.1.0",
      "express-rate-limit": "^7.4.1",
      dotenv: "^16.4.7",
      sequelize: "^6.37.7",
      uuid: "^10.0.0",
      mysql2: "^3.14.0",
    },
    devDependencies: {
      "@types/express": "^5.0.1",
      "@types/cors": "^2.8.17",
      "@types/node": "^22.14.0",
      "@types/uuid": "^10.0.0",
      nodemon: "^3.1.9",
      "ts-node": "^10.9.2",
      typescript: "^5.8.3",
    },
  };

  fs.writeFileSync(path.join(servicePath, "package.json"), JSON.stringify(packageJson, null, 2));

  // .env.example
  const envExample = `# ${serviceName} Environment Variables
SERVICE_NAME=${serviceName}
PORT=${port}
NODE_ENV=development

DB_TYPE=${dbType}
DB_NAME=${dbName}
DB_USER=${dbType === "postgres" ? "postgres" : "root"}
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=${defaultPort}

DB_SYNC=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_ATTEMPTS=100
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
`;

  fs.writeFileSync(path.join(servicePath, ".env.example"), envExample);

  // Copia altri file
  const filesToCopy = ["tsconfig.json", ".gitignore"];
  filesToCopy.forEach((file) => {
    const sourcePath = path.join(__dirname, "..", file);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, path.join(servicePath, file));
    }
  });

  // README
  const readme = `# ${serviceName}

Servizio EDG generato dal template.

## 🚀 Quick Start

\`\`\`bash
npm install
cp .env.example .env
# Configura database in .env
npm run dev
\`\`\`

Servizio disponibile su: http://localhost:${port}
Database: ${dbType} (${dbName})

## 📝 TODO
- [ ] Implementare modelli specifici
- [ ] Aggiungere business logic
- [ ] Configurare validazione
- [ ] Implementare test
`;

  fs.writeFileSync(path.join(servicePath, "README.md"), readme);

  console.log("✅ Servizio creato con successo!");
  console.log("");
  console.log("📋 Prossimi passi:");
  console.log(`1. cd ../${serviceName}`);
  console.log("2. npm install");
  console.log("3. cp .env.example .env");
  console.log("4. npm run dev");
  console.log("");
  console.log(`🎯 Servizio: http://localhost:${port}`);
} catch (error) {
  console.error("❌ Errore:", error.message);
  if (fs.existsSync(servicePath)) {
    fs.rmSync(servicePath, { recursive: true, force: true });
  }
  process.exit(1);
}
