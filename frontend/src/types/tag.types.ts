export interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  usageCount: number;
  /** Renseigné uniquement pour un membre connecté */
  followedByMe: boolean | null;
}
