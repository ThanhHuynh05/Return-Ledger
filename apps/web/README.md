# ReturnLedger web application

React and TypeScript application built with Vite.

## Run locally

Start the API in a separate terminal, then run these commands from this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:5173. The development port is fixed; Vite reports an error if it is occupied.

## Checkpoint A behavior

The page fetches http://localhost:3000/health and displays loading, success, or failure.
Failed requests time out after eight seconds. Try again retries without reloading.

To verify recovery, stop the API, refresh the page, then restart the API and select Try again.

The API address is fixed for this local checkpoint. Environment-driven deployment configuration comes later.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
```

Node.js 24 LTS and npm 11 are used for this checkpoint.
