# Checkpoint A: Connect the applications

[Foundation index](./README.md) | [Next: persistence](./checkpoint-b-add-persistence.md)

Status: Implemented. This guide explains how to run and verify the existing checkpoint.

## Goal

React calls the NestJS health endpoint and displays:

```text
API connected
returnledger-api: ok
```

This checkpoint proves local application connectivity. It does not prove database readiness, authentication, or reconciliation correctness.

## A1. Check the installed tools

From the repository root:

```powershell
node --version
npm.cmd --version
git --version
```

The current packages target Node 24.x, beginning at 24.11.0, and npm 11.x. The repository uses the Node-compatible NestJS 11 scaffold. Check package.json engines before changing runtime versions.

Expected: all three commands print versions.

## A2. Understand the two applications

- [API package](../../apps/server/package.json): NestJS, TypeScript, Jest, HTTP tests.
- [Frontend package](../../apps/web/package.json): React, TypeScript, Vite, frontend lint.
- Each application owns its package-lock.json.
- There is no root npm workspace or root package.json.

Run npm commands inside the corresponding application directory, or use --prefix from the root.

Do not scaffold the applications again; they already exist.

## A3. Install dependencies from the lockfiles

```powershell
npm.cmd --prefix apps/server ci --include=dev --no-audit
npm.cmd --prefix apps/web ci --include=dev --no-audit
```

Use ci for a fresh checkout. It replaces generated node_modules content using the committed lockfile. Stop your development servers before a clean reinstall.

Expected: both commands finish successfully. Development dependencies are needed for TypeScript, lint, and tests.

## A4. Inspect the API health route

File: [apps/server/src/app.controller.ts](../../apps/server/src/app.controller.ts).

Keep the existing root endpoint. The added method is:

```typescript
@Get('health')
getHealth() {
  return {
    status: 'ok',
    service: 'returnledger-api',
  };
}
```

Expected: GET / returns the original scaffold response; GET /health returns the JSON contract above.

## A5. Inspect local access configuration

File: [apps/server/src/main.ts](../../apps/server/src/main.ts).

The application permits the frontend origin http://localhost:5173 through CORS. The API listens on loopback, with default port 3000.

File: [apps/web/vite.config.ts](../../apps/web/vite.config.ts).

Vite uses localhost, port 5173, and strictPort. Use that exact frontend origin during this checkpoint.

Expected: Vite reports an occupied port instead of silently changing to another port.

## A6. Start the API

In terminal 1, from the repository root:

```powershell
Set-Location apps/server
npm.cmd run start:dev
```

Expected: compilation succeeds and Nest reports that the application started.

In a separate terminal:

```powershell
Invoke-RestMethod 'http://localhost:3000/health'
```

Expected fields:

```json
{
  "status": "ok",
  "service": "returnledger-api"
}
```

Leave terminal 1 running.

## A7. Start the frontend

In terminal 2, from the repository root:

```powershell
Set-Location apps/web
npm.cmd run dev
```

Open http://localhost:5173.

Expected: the page shows API connected and returnledger-api: ok.

## A8. Understand loading and recovery

File: [apps/web/src/App.tsx](../../apps/web/src/App.tsx).

The page:

1. Shows a checking state.
2. Requests GET /health.
3. Validates the returned status and service.
4. Displays success or an error.
5. Times out a failed request after eight seconds.
6. Lets the user retry without a full reload.

Verify recovery:

1. Stop terminal 1 with Ctrl+C.
2. Refresh the frontend.
3. Confirm API unavailable and the Try again button.
4. Restart the API.
5. Select Try again.
6. Confirm API connected returns.

Expected: no frontend code edit is needed to recover.

## A9. Verify CORS

With both applications running:

```powershell
$response = Invoke-WebRequest 'http://localhost:3000/health' -Headers @{ Origin = 'http://localhost:5173' }
$response.Headers['Access-Control-Allow-Origin']
```

Expected: http://localhost:5173.

The browser's actual successful fetch is the final connectivity check. Receiving JSON in PowerShell alone does not verify browser CORS behavior.

## A10. Run the checks

From the repository root:

```powershell
npm.cmd --prefix apps/server run build
npm.cmd --prefix apps/server run lint
npm.cmd --prefix apps/server test -- --runInBand
npm.cmd --prefix apps/server run test:e2e -- --runInBand
npm.cmd --prefix apps/web run build
npm.cmd --prefix apps/web run lint
```

To type-check server source and test files together:

```powershell
Set-Location apps/server
npx.cmd --no-install tsc --noEmit --incremental false -p tsconfig.json
```

Expected: all checks pass. At the documented baseline there is one backend unit test and three HTTP tests.

## A11. Verify test types and dependency integrity

[Server tsconfig.json](../../apps/server/tsconfig.json) explicitly includes node and jest types. [The production build config](../../apps/server/tsconfig.build.json) selects only node types and excludes tests.

From the repository root:

```powershell
npm.cmd --prefix apps/server ls --depth=0
npm.cmd --prefix apps/web ls --depth=0
```

Expected: Jest, its types, ts-jest, and TypeScript appear in the server; React, Vite, and TypeScript appear in the frontend.

The server's Webpack override resolves an incompatible transitive version. Keep it until a reviewed dependency update removes the need.

## A12. Review and commit

From the repository root:

```powershell
git status --short
git diff --check
git diff --stat
```

For a newly implemented checkpoint, stage its reviewed files and use:

```text
feat: scaffold web and API with health connectivity
```

The original checkpoint was already committed. Do not create an empty duplicate commit. Review any later dependency/configuration changes separately.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| npm.ps1 is blocked | Use npm.cmd and npx.cmd in PowerShell |
| EADDRINUSE | Stop the application already using that port; do not terminate unrelated processes |
| Browser fails but PowerShell succeeds | Confirm the browser origin is localhost:5173 and inspect CORS |
| describe or expect is unknown | Confirm @types/jest is installed and server tsconfig includes jest; restart the editor's TypeScript server |
| npm reports missing optional WASM packages on Windows | Check the required Windows binding; a newer compatible npm 11 patch can normalize the lockfile without a global upgrade |
| Cannot find package.json | Return to the repository root and use --prefix, or enter the correct app folder |

For the previously encountered optional-package bookkeeping issue, from apps/server:

```powershell
npx.cmd --yes --package=npm@11.21.1 npm install --include=dev --no-audit
```

Use that recovery command only when the symptom exists. Review package/lockfile changes afterward.

## Acceptance checklist

- [x] API and frontend applications exist.
- [x] GET /health has a stable JSON contract.
- [x] Browser displays the health response.
- [x] Loading, failure, and retry states exist.
- [x] Builds, lint, and backend checks passed during implementation.
- [x] Dependency lockfiles are present.
- [x] Setup commands are documented.

Re-run the checks after later changes; these boxes record the baseline rather than an ongoing availability guarantee.

## References

- [NestJS first steps](https://docs.nestjs.com/first-steps)
- [NestJS CORS](https://docs.nestjs.com/security/cors)
- [Vite getting started](https://vite.dev/guide/)
- [TypeScript explicit types](https://www.typescriptlang.org/tsconfig/types.html)
