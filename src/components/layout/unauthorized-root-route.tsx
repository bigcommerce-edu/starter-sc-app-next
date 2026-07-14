export function UnauthorizedRootRoute() {
  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "2rem", textAlign: "center" }}>
      <h1>Unauthorized</h1>
      <p>
        This page is not accessible when the app is running in multi-tenant mode. Every request in multi-tenant
        mode must include a store hash in the URL and be authenticated accordingly.
      </p>
      <p>
        This root-level route only exists for mock and static-token development. Never deploy the app to
        production with a configuration that serves it.
      </p>
    </div>
  );
}
