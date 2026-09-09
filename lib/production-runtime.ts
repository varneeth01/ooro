/**
 * Netlify sets CONTEXT/DEPLOY_CONTEXT, while local and other hosts commonly
 * set NODE_ENV. Read this at call time so serverless invocations and tests see
 * the current runtime environment.
 */
export function isProductionRuntime() {
  return process.env.CONTEXT === "production" ||
    process.env.DEPLOY_CONTEXT === "production" ||
    process.env.NODE_ENV === "production";
}
