// Cloudflare (OpenNext): страниците, изградени предварително, се сервират от статичните файлове, без да се пуска кодът.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache, enableCacheInterception: true });
