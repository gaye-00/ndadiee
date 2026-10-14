package com.hautetech.ndadiee.common;

public final class TextUtils {

    private static final int EXCERPT_LENGTH = 200;
    private static final int WORDS_PER_MINUTE = 200;

    private TextUtils() {
    }

    /** Extrait en texte brut d'un contenu Markdown, pour les listes. */
    public static String excerpt(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        String text = markdown
                .replaceAll("(?s)```.*?```", " ")                    // blocs de code
                .replaceAll("!\\[[^\\]]*\\]\\([^)]*\\)", " ")        // images
                .replaceAll("\\[([^\\]]*)\\]\\([^)]*\\)", "$1")      // liens : on garde le libellé
                .replaceAll("(?m)^\\s{0,3}(#{1,6}|>|[-*+]|\\d+\\.)\\s+", "") // titres, citations, listes
                .replaceAll("[*_`~]", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (text.length() <= EXCERPT_LENGTH) {
            return text;
        }
        String cut = text.substring(0, EXCERPT_LENGTH);
        int lastSpace = cut.lastIndexOf(' ');
        if (lastSpace > EXCERPT_LENGTH / 2) {
            cut = cut.substring(0, lastSpace);
        }
        return cut + "…";
    }

    /** Temps de lecture estimé, 1 minute au minimum. */
    public static int readingTimeMinutes(String content) {
        if (content == null || content.isBlank()) {
            return 1;
        }
        int words = content.trim().split("\\s+").length;
        return Math.max(1, (int) Math.ceil(words / (double) WORDS_PER_MINUTE));
    }
}
