---
"@easy-web/swa": patch
---

Point the sidecar `docs` URL at a publicly reachable page

`easyWebNotFound()` writes a `docs` key into
`staticwebapp.config.json.easy-web-managed.json`, and that file is committed
to every consuming site's repository. The URL it carried pointed into a
private index repository, so the one audience it exists for — whoever finds
an unfamiliar generated file in their repo and wants to know what wrote it —
could not open it. Public sites were also committing a private URL into
public history.

It now points at the `@easy-web/swa` README, which documents what writes the
sidecar and which keys it claims.

Consuming sites will see the `docs` value rewritten on their next build. No
other key changes, and the integration's ownership behaviour is unaffected.
