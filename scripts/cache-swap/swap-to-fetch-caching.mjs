// TODO: Build the script that converts this app from Cache Components to
// fetch-level caching, for hosting targets that can't run Cache Components.
//
// TODO: Pass 1 — removals. Delete every region wrapped in
// @cache-components-only markers, and drop the single specifier named by a
// @cache-components-only:drop-specifier marker from the import that follows it.
//
// TODO: Pass 2 — fetch cache options. For each entry in
// fetch-cache-manifest.json's `fetchCaching`, insert a `cache: { profile, tags }`
// option into the one apiClient.get call inside the named function. Fail rather
// than guess if the function has no options object, or more than one get call.
//
// TODO: Pass 3 — invalidations. Apply the manifest's `invalidations` entries:
// rewrite the tag-invalidation calls if configured to, and add the companion
// list-tag invalidation that fetch caching needs after each per-record one.
//
// TODO: Pass 4 — leftover check. Fail the swap if any Cache Components-only
// API survives anywhere in the searched directories, so a construct nobody
// wrapped can't be left behind silently.
