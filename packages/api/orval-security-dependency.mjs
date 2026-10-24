/** Orval loads an entire external spec for a securityScheme ref. Keep only that dependency
 * when generating business clients so Auth's ErrorCode cannot collide with business ErrorCode.
 * The standalone auth-profile client is generated from the complete unmodified document.
 */
export default function securityDependency(spec) {
  if (spec.info?.title !== "Cashflow Auth/Profile API") return spec;
  return { ...spec, paths: {}, components: { securitySchemes: spec.components?.securitySchemes } };
}
