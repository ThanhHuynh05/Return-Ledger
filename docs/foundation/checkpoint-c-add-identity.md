# Checkpoint C: Add identity and permissions

[Foundation index](./README.md) | [Previous: persistence](./checkpoint-b-add-persistence.md) | [Next: repeatable setup](./checkpoint-d-repeatable-setup.md)

Status: Planned. This is an implementation guide, not a statement that sign-in currently exists.

## Goal

A user can sign in, access records belonging to an authorized organization, and receive a rejection for unauthorized actions.

Prerequisites: checkpoints A and B pass.

## C1. Separate identity from membership

- The identity provider proves who the user is.
- ReturnLedger links a verified issuer/subject pair to its User record.
- PostgreSQL Membership determines organization access and role.
- A token claim or browser-selected organization does not grant membership.
- Email is display/contact information, not a safe identity-linking key.

The concrete local example uses Keycloak. The application owns permissions, so a future provider replacement does not require moving business roles out of the database.

## C2. Add a local identity provider

Merge this service into the existing services section of root compose.yaml:

```yaml
  keycloak:
    image: quay.io/keycloak/keycloak:26.8.1
    command: ["start-dev"]
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KEYCLOAK_ADMIN_USERNAME:?Set the local admin username}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:?Set the local admin password}
    ports:
      - "127.0.0.1:8080:8080"
    volumes:
      - keycloak-data:/opt/keycloak/data
```

Also add keycloak-data to the existing top-level volumes section. Do not create a second services or volumes key.

Add placeholders to root .env.example and local values to root .env:

```dotenv
KEYCLOAK_ADMIN_USERNAME=local_admin
KEYCLOAK_ADMIN_PASSWORD=replace_with_local_admin_password
```

Then, from the repository root:

```powershell
docker compose up -d keycloak
docker compose logs keycloak
```

Expected: the administrative interface is reachable at http://localhost:8080.

This uses development mode and local storage. It is a local exercise, not the identity provider's production deployment configuration.

## C3. Configure a realm and browser client

In the local Keycloak administration interface:

1. Create a realm named returnledger; do not put application users in the master realm.
2. Create an OpenID Connect client named returnledger-web.
3. Make the browser client public by turning client authentication off.
4. Enable the standard authorization-code flow.
5. Require PKCE with S256.
6. Keep implicit flow and direct password grants disabled.
7. Set the valid redirect URI to http://localhost:5173/.
8. Set the allowed post-logout redirect URI to http://localhost:5173/.
9. Set the web origin to http://localhost:5173.

Expected: the SPA can use an authorization code plus PKCE. There is no client secret in browser code.

## C4. Configure the API audience

Create a client named returnledger-api to represent the resource server. This API validates access tokens; it does not need a client secret merely to verify signatures.

On the web client's dedicated client scope, add an audience mapper:

- Included client audience: returnledger-api.
- Add to access token: enabled.
- Add to ID token: disabled.

Verify the realm signs the access token with RS256.

Expected: the access token's audience includes returnledger-api. An ID token is not accepted as the API credential.

## C5. Create synthetic users and link the analyst

Create local analyst and viewer users through Keycloak's Users interface. Set their local passwords through its Credentials interface.

Record each user's provider ID from the administration interface. Do not copy tokens or passwords into committed files.

In apps/server/.env, set:

```dotenv
SEED_IDENTITY_ISSUER=http://localhost:8080/realms/returnledger
SEED_IDENTITY_SUBJECT=replace_with_the_analyst_provider_user_id
```

From apps/server:

```powershell
npx.cmd prisma db seed
```

The B seed updates the fixed demo user's issuer/subject link.

Extend the synthetic fixtures to include:

| Fixture | Membership |
| --- | --- |
| Analyst A | Active ANALYST in organization A |
| Viewer A | Active VIEWER in organization A |
| Administrator A | Active ADMINISTRATOR in organization A |
| User B | Active membership in synthetic organization B only |
| Disabled member | Inactive membership in organization A |
| Unlinked provider user | No application User link |

Use stable IDs/upserts. Organization B is a test boundary, not a second merchant onboarding feature.

Expected: linking the verified identity makes an existing membership usable; signing in alone does not provision access.

## C6. Add backend authentication packages and configuration

From apps/server:

```powershell
npm.cmd install @nestjs/passport@11 passport passport-jwt jwks-rsa --no-audit
npm.cmd install --save-dev @types/passport-jwt --no-audit
```

Add server environment examples:

```dotenv
AUTH_ISSUER=http://localhost:8080/realms/returnledger
AUTH_AUDIENCE=returnledger-api
AUTH_JWKS_URI=http://localhost:8080/realms/returnledger/protocol/openid-connect/certs
```

Validate these values at startup. Never choose the JWKS endpoint from an untrusted token field.

Expected: application startup fails with a concise configuration message if a required authentication setting is missing. Logs must not print tokens.

## C7. Implement bearer-token validation

Create an authentication module, a Passport JWT strategy, and a guard.

The strategy must:

1. Read the bearer access token.
2. Obtain keys from the configured JWKS endpoint with caching and bounded requests.
3. Restrict signing algorithms to RS256 for this realm.
4. Validate signature, issuer, audience, expiry, and applicable not-before claims.
5. Validate the issuer/subject claim types.
6. Find the application User by the verified issuer/subject pair.
7. Attach the application user ID as the authenticated principal.

Illustrative strategy options:

```typescript
{
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKeyProvider: passportJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: configuredJwksUri,
  }),
  issuer: configuredIssuer,
  audience: configuredAudience,
  algorithms: ['RS256'],
  ignoreExpiration: false,
}
```

This is the options object for PassportStrategy(Strategy), not a complete source file. Wire it through Nest providers and validate configuration before constructing it.

Expected outcomes:

- Missing, malformed, expired, wrongly signed, wrong-issuer, or wrong-audience token: 401.
- Valid provider identity without an application link: 403.
- Database/provider infrastructure failure: controlled operational error, not a fabricated successful identity.

## C8. Protect routes by default

Register authentication through a global guard or an equally explicit default-deny mechanism.

Add public-route metadata only to:

- Existing process health.
- Database readiness, with minimal diagnostics.
- The existing scaffold root response if retained.

Add protected GET /me. It should return a minimal profile and active organization memberships.

Do not build a password-collection endpoint in ReturnLedger; sign-in uses the provider's authorization flow.

Expected: a new route requires an explicit access decision. Health continues to support checkpoint A.

## C9. Enforce organization membership in services

Proposed read endpoints:

```text
GET /organizations/:organizationId/orders
GET /organizations/:organizationId/orders/:id
```

For every operation:

1. Validate path identifiers.
2. Authenticate the user.
3. Check active membership for the requested organization.
4. Check the operation's permission.
5. Query business records with organization_id included.
6. Return only the authorized rows.

A record query must include both its ID and organization ID. Never load by ID alone and assume the browser supplied a trustworthy organization.

For these guides, use 403 when the caller is not a member of the requested organization. For a missing or inaccessible record inside an authorized organization, return 404.

Expected: User B cannot access organization A's list or record by guessing its UUID.

## C10. Add one small protected mutation

Use POST /organizations/:organizationId/orders to create a synthetic order. This provides a real permission check without adding refund execution.

Input: a validated order reference. The server sets organization ownership from the authorized route context and currency to USD.

Initial permission matrix:

| Role | Read organization orders | Create sample order | Manage memberships |
| --- | --- | --- | --- |
| VIEWER | Yes | No | No |
| ANALYST | Yes | Yes | No |
| SUPERVISOR | Yes | Yes | No |
| ADMINISTRATOR | Yes | No, unless separately granted | Yes |

If membership-management endpoints are introduced, prevent users from granting their own authority and record an audit entry. Add the required audit-table migration before implementing that mutation.

Enforce uniqueness through the database. A conflicting organization/order reference should return a clear conflict instead of silently overwriting a row.

Expected: a viewer receives 403 and creates zero orders. An analyst succeeds only in an organization where the required membership exists.

## C11. Add frontend sign-in

From apps/web:

```powershell
npm.cmd install keycloak-js --no-audit
```

Add apps/web/.env.example:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=returnledger
VITE_KEYCLOAK_CLIENT_ID=returnledger-web
```

These VITE values are public browser configuration. Server secrets must not use that prefix.

Implement an identity adapter that:

- Creates one Keycloak client instance.
- Initializes once before protected navigation; account for React StrictMode.
- Uses PKCE S256.
- Starts login only from an explicit Sign in action.
- Keeps the public checkpoint A page available without a provider redirect.
- Keeps access tokens in memory rather than persistent browser storage.
- Refreshes the token before protected requests.
- Sends Authorization: Bearer on API requests.
- Loads organization choices from GET /me.
- Clears organization-specific state on logout or account change.

The API remains the authority for permissions even if the UI hides unavailable controls.

Expected: sign-in returns to the application, /me succeeds, and permitted organization data appears.

## C12. Keep authorization race-safe

Permission checks belong in application services so future workers and other entry points cannot bypass them.

Recheck membership/current record state within the write transaction where necessary. For concurrent membership revocation and privileged writes, define a locking/version policy instead of relying solely on an earlier UI check.

A role in a token may inform identity-provider behavior, but application membership remains authoritative.

Expected: removing access is effective on subsequent API operations without waiting for a long-lived token to expire.

## C13. Automate the rejection cases

Use a disposable test database and a local JWKS fixture that signs test tokens. Keep its private key test-only and generate it in memory where practical. Never use a live user's token.

| Case | Expected result |
| --- | --- |
| No token | 401 |
| Expired token | 401 |
| Wrong issuer, audience, or signature | 401 |
| Valid identity with no application link | 403 |
| Inactive membership | 403 |
| User B requests organization A | 403 |
| Viewer creates an order | 403; database unchanged |
| Analyst creates in organization A | 201 |
| Analyst submits duplicate reference | Conflict; count unchanged |
| Valid analyst reads existing record | 200 |
| Authorized organization plus unknown record ID | 404 |
| Public health without a token | 200 |

Bind the test JWKS service to loopback, give it a stable configured issuer/audience, and close it after tests. The verification must exercise real signature checks rather than replacing the whole authentication guard with a permanent allow-all mock.

Expected: all cases pass without a personal cloud account.

## C14. Save evidence and commit

Save:

- Local sign-in and logout demonstration.
- /me response with no secret fields.
- Role/organization test output.
- Database evidence for rejected mutations.
- Configuration examples with placeholders only.

Suggested commit:

```text
feat: add sign-in and organization authorization
```

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Token rejected for audience | Check the web client's access-token audience mapper |
| Issuer mismatch | Use the exact issuer URL; localhost and 127.0.0.1 are different issuer strings |
| JWT succeeds but /me is forbidden | Check the User issuer/subject link |
| Redirect loop | Check exact redirect URI, initialization, and whether automatic login was enabled on the public page |
| Frontend works but API returns 403 | Check active database membership and operation permission |
| Browser refresh loses sign-in state | Let the identity adapter re-establish its session; do not persist raw tokens as a shortcut |

## Acceptance checklist

- [ ] Local users can sign in and out.
- [ ] Access tokens are verified against configured keys and claims.
- [ ] Application users are linked by issuer and subject.
- [ ] Business routes require active organization membership.
- [ ] Viewer, analyst, and administrator permissions differ.
- [ ] Cross-organization list and record access fails.
- [ ] Rejected mutations leave the database unchanged.
- [ ] Public health still works.
- [ ] Identity-provider secrets are absent from frontend configuration.
- [ ] Automated authentication/authorization tests pass.

## References

- [Keycloak Docker development setup](https://www.keycloak.org/getting-started/getting-started-docker)
- [Keycloak browser adapter and PKCE](https://www.keycloak.org/securing-apps/javascript-adapter)
- [NestJS Passport integration](https://docs.nestjs.com/recipes/passport)
- [NestJS guards](https://docs.nestjs.com/guards)
