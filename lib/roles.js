// "admin" (nivel general del sistema) y "estaca" (líder de estaca)
// comparten el mismo nivel de acceso en toda la app: ambos van al panel
// /admin y ven/administran todos los Barrios, líderes y jóvenes.
export const STAFF_ROLES = ["admin", "estaca"];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}
