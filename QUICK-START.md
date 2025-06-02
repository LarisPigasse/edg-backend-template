# 🚀 EDG Backend Template - Guida Rapida

## ⚡ Setup Template (Una Volta)

```bash
# 1. Clona il template
git clone <your-repo>/edg-backend-template
cd edg-backend-template

# 2. Installa dipendenze
npm install

# 3. Configura database
cp .env.example .env
# Modifica .env con le tue credenziali MySQL

# 4. Test template
npm run dev
# Verifica: http://localhost:3001/template/info
```

## 🛠️ Genera Nuovo Servizio

```bash
# Dalla directory template
npm run create-service orders-service

# Vai nel nuovo servizio
cd ../orders-service

# Setup rapido
npm install
cp .env.example .env
# Modifica .env con credenziali database

# Avvia servizio
npm run dev
```

## 📊 Database Setup

### MySQL

```bash
# .env
DB_TYPE=mysql
DB_NAME=edg_orders
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_SYNC=true  # Solo prima volta
```

### PostgreSQL

```bash
# .env
DB_TYPE=postgres
DB_NAME=edg_orders
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_SYNC=true  # Solo prima volta
```

## 🎯 Servizi Comuni

```bash
# Servizi backend tipici
npm run create-service auth-service      # Port 3001
npm run create-service orders-service    # Port 3002
npm run create-service partners-service  # Port 3003
npm run create-service clients-service   # Port 3004
npm run create-service reports-service   # Port 3005
```

## 📝 Sviluppo

### Comandi Base

```bash
npm run dev        # Development con hot reload
npm run build      # Build per production
npm run start      # Avvia production build
npm run db:sync    # Sync database (solo dev)
```

### Struttura Servizio

```
your-service/
├── src/
│   ├── core/           # ← Template framework
│   ├── modules/        # ← La tua business logic
│   └── app.ts          # ← Entry point
├── .env                # ← Configurazione locale
└── package.json        # ← Dependencies pronte
```

### Personalizzazione

```typescript
// src/app.ts - Modifica il modulo principale
const mainModule: ServerModule = {
  name: "orders",
  path: "/api/orders",
  router: ordersRouter, // ← Le tue route
  models: [OrderModel], // ← I tuoi modelli
};
```

## 🔧 Tips

- **Database Sync**: Usa `DB_SYNC=true` solo per sviluppo
- **Porte**: Ogni servizio ha una porta automatica (3001, 3002, etc.)
- **Hot Reload**: Modifiche al codice = riavvio automatico
- **Health Check**: Ogni servizio ha `/health` automatico
- **CORS**: Pre-configurato per localhost + production

## 🎉 Risultato

**5 minuti** = Servizio backend completo con:
✅ Express + TypeScript  
✅ Database configurato  
✅ Security middleware  
✅ Error handling  
✅ Hot reload development  
✅ Health checks

---

**🚀 Da 0 a servizio funzionante in 5 minuti!**
