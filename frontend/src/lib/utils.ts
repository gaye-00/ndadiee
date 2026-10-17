import { createCn } from "cn/config"

/**
 * Fusion de classes Tailwind (clsx + tailwind-merge), importée par les composants shadcn et 21st.dev.
 *
 * Les échelles propres au design sont déclarées ici. Sans cela, cn("text-h3", "text-jade") prendrait
 * text-h3 pour une couleur et le supprimerait, comme toute classe inconnue de tailwind-merge.
 * À compléter quand une échelle est ajoutée à src/styles/theme.css.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "h5", "lead", "body"],
      font: ["display", "heading"],
      shadow: ["lift", "glow", "float"],
      animate: ["float", "pulse-dot", "blink", "spin-slow"],
      ease: ["out-expo"],
      container: ["page"],
    },
    classGroups: {
      // Dégradés de styles/effects.css : une image de fond, compatible avec une couleur de fond
      "bg-image": [{ bg: ["kente", "kente-warm", "kente-conic"] }],
    },
  },
})
