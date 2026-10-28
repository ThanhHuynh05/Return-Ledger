# ReturnLedger API

NestJS API for ReturnLedger. Checkpoint A provides process health and local frontend connectivity.

## Run locally

From this directory, using Node.js 24 LTS and npm 11:

```powershell
npm.cmd ci
npm.cmd run start:dev
```

The default address is http://localhost:3000. The server binds to loopback only.
An optional PORT environment variable changes the API port; the checkpoint frontend expects port 3000.

## Endpoints

- GET /: original scaffold response.
- GET /health: returns {"status":"ok","service":"returnledger-api"}.

Health currently indicates that the API process responds; it does not check a database.

CORS permits the local frontend origin http://localhost:5173.

## TypeScript and dependency configuration

The editor and test configuration explicitly includes Node and Jest types. The
production build includes only Node types and excludes test files.

The Webpack override in package.json keeps the Nest CLI and its plugins on one
compatible Webpack 5 version. Reassess this override when upgrading the CLI.

## Checks

```powershell
npm.cmd run build
npx.cmd --no-install tsc --noEmit --incremental false -p tsconfig.json
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
```

Database integration, identity, and reconciliation belong to later checkpoints.
