/**
 * Source de vérité unique pour la taxonomie des rôles.
 *
 * Les 5 valeurs écrites à l'inscription (militaire, police, ipsc, instructeur,
 * autre) encodent surtout le PROFIL. La FONCTION dans l'app est binaire :
 * instructeur (gère des tireurs) vs tireur. On dérive cette fonction ici et on
 * route toute l'app dessus, en conservant les anciennes valeurs ("shooter",
 * "instructor", "club_manager") pour ne rien casser.
 */

export type RoleOption = { value: string; label: string };

/** Les 5 rôles proposés à l'inscription (profil). */
export const ROLE_OPTIONS: RoleOption[] = [
  { value: "militaire", label: "Armée de Terre" },
  { value: "police", label: "Police / Gendarmerie" },
  { value: "ipsc", label: "Tireur sportif IPSC" },
  { value: "instructeur", label: "Instructeur / Moniteur" },
  { value: "autre", label: "Autre professionnel" },
];

/** Rôles à fonction instructeur. Inclut l'ancienne valeur anglaise. */
export const INSTRUCTOR_ROLES = ["instructeur", "instructor"] as const;

/** Rôles qui ne sont PAS des tireurs (instructeurs + responsable de club). */
export const NON_SHOOTER_ROLES = [...INSTRUCTOR_ROLES, "club_manager"] as const;

/** Vrai si le rôle exerce une fonction instructeur (nouvelle ou ancienne valeur). */
export function isInstructorRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (INSTRUCTOR_ROLES as readonly string[]).includes(role.toLowerCase());
}

/**
 * Vrai si l'utilisateur a la fonction tireur.
 * => militaire/police/ipsc/autre + ancien "shooter" = tireur.
 * => instructeur/instructor/club_manager + admin = non-tireur.
 */
export function isShooterRole(
  role: string | null | undefined,
  isAdmin = false
): boolean {
  if (isAdmin) return false;
  const r = (role ?? "").toLowerCase();
  return !(NON_SHOOTER_ROLES as readonly string[]).includes(r);
}
