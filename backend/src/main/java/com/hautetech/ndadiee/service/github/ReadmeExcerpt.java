package com.hautetech.ndadiee.service.github;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Le début d'un README devenu description de projet. La page du projet montre des paragraphes et des listes à
 * puces, avec du gras et du `code` (frontend : projects/markdownBlocks.ts) : on garde l'introduction du README dans
 * cette forme, sans titres, badges, images, HTML, blocs de code ni tableaux, et les liens réduits à leur texte. On
 * s'arrête aux sections techniques (installation, utilisation, contribution…), à quatre blocs ou vers 1 200 caractères.
 */
final class ReadmeExcerpt {

    static final int MAX_CHARS = 1200;
    static final int MAX_BLOCKS = 4;
    static final int MAX_LIST_ITEMS = 8;

    private static final Pattern HTML_COMMENT = Pattern.compile("<!--.*?-->", Pattern.DOTALL);
    private static final Pattern FENCE = Pattern.compile("^ {0,3}(`{3,}|~{3,})[^\\n]*\\n.*?^ {0,3}\\1[^\\n]*$", Pattern.DOTALL | Pattern.MULTILINE);
    private static final Pattern HEADING = Pattern.compile("^#{1,6}\\s+(.*?)\\s*#*$");
    private static final Pattern SETEXT = Pattern.compile("^(=+|-+)$");
    private static final Pattern RULE = Pattern.compile("^([-*_]\\s*){3,}$");
    private static final Pattern LINK_DEFINITION = Pattern.compile("^\\[[^\\]]+\\]:\\s*\\S+.*$");
    private static final Pattern LIST_ITEM = Pattern.compile("^(?:[-*+]|\\d+[.)])\\s+(?:\\[[ xX]\\]\\s+)?(.+)$");
    // Une rangée de liens de navigation, une fois les liens réduits à leur texte : « Site | Blog | Documentation »
    private static final Pattern LINK_ROW = Pattern.compile("^[^|·•]{1,40}(\\s*[|·•]\\s*[^|·•]{1,40})+$");
    // Sections après lesquelles le README parle d'installer ou de contribuer, plus du projet lui-même
    private static final Pattern TECHNICAL_SECTION = Pattern.compile("^(table of contents|contents|toc|sommaire|table des mati[eè]res"
            + "|install|getting started|get started|quick ?start|usage|utilisation|setup|requirements|prerequisites|pr[ée]requis"
            + "|build|development|developing|d[ée]veloppement|contribut|license|licence|deploy|d[ée]ploiement|d[ée]marrage|lancer"
            + "|configuration|running|tests?\\b|testing|documentation|docs\\b|api\\b|faq|roadmap|changelog|credits|cr[ée]dits"
            + "|acknowledg|remerciements|authors|auteurs|support|sponsors?|contact)", Pattern.CASE_INSENSITIVE);

    private ReadmeExcerpt() {
    }

    /**
     * @param markdown le README
     * @param name     le nom du dépôt : un bloc qui ne dit que lui (le titre centré en HTML) est sauté
     * @return l'introduction, en paragraphes et listes séparés par une ligne vide ; null s'il n'y a rien à en tirer
     */
    static String of(String markdown, String name) {
        if (markdown == null || markdown.isBlank()) {
            return null;
        }
        String text = markdown.replace("\r\n", "\n").replace('\r', '\n');
        text = HTML_COMMENT.matcher(text).replaceAll("");
        text = FENCE.matcher(text).replaceAll("\n");

        List<String> excerpt = new ArrayList<>();
        int length = 0;
        boolean skipping = false;
        for (String block : text.split("\\n\\s*\\n")) {
            List<String> lines = block.lines().map(String::strip).filter(line -> !line.isEmpty()).toList();
            if (lines.isEmpty()) {
                continue;
            }

            // Un titre ouvre une section : celles qui parlent d'installation arrêtent l'extrait, ou sont sautées
            // tant qu'il n'a pas commencé (« Sommaire » en tête du README)
            String title = headingOf(lines);
            if (title != null) {
                skipping = TECHNICAL_SECTION.matcher(title).find();
                if (skipping && !excerpt.isEmpty()) {
                    break;
                }
                lines = lines.subList(HEADING.matcher(lines.get(0)).matches() ? 1 : 2, lines.size());
            }
            if (skipping || lines.isEmpty() || lines.get(0).startsWith("|")
                    || lines.stream().allMatch(line -> RULE.matcher(line).matches() || LINK_DEFINITION.matcher(line).matches())) {
                continue;
            }

            String rendered = render(lines, name);
            if (rendered == null) {
                continue;
            }
            if (length + rendered.length() > MAX_CHARS) {
                if (excerpt.isEmpty()) {
                    excerpt.add(truncate(rendered));
                }
                break;
            }
            excerpt.add(rendered);
            length += rendered.length() + 2;
            if (excerpt.size() >= MAX_BLOCKS) {
                break;
            }
        }
        // Une phrase qui annonce une liste restée hors de l'extrait (« Il sait : ») ne dit plus rien
        while (!excerpt.isEmpty() && excerpt.getLast().endsWith(":")) {
            excerpt.removeLast();
        }
        return excerpt.isEmpty() ? null : String.join("\n\n", excerpt);
    }

    // Le titre d'un bloc qui commence par « # Titre » ou par un titre souligné (=== / ---) ; null sinon
    private static String headingOf(List<String> lines) {
        Matcher atx = HEADING.matcher(lines.get(0));
        if (atx.matches()) {
            return inline(atx.group(1));
        }
        if (lines.size() >= 2 && SETEXT.matcher(lines.get(1)).matches() && !LIST_ITEM.matcher(lines.get(0)).matches()) {
            return inline(lines.get(0));
        }
        return null;
    }

    // Une liste à puces, ou un paragraphe d'une ligne ; null s'il n'en reste rien (une rangée de badges)
    private static String render(List<String> lines, String name) {
        if (lines.stream().allMatch(line -> LIST_ITEM.matcher(line).matches())) {
            List<String> items = lines.stream()
                    .map(line -> {
                        Matcher item = LIST_ITEM.matcher(line);
                        return item.matches() ? inline(item.group(1)) : "";
                    })
                    .filter(ReadmeExcerpt::meaningful)
                    .limit(MAX_LIST_ITEMS)
                    .map(item -> "- " + item)
                    .toList();
            return items.isEmpty() ? null : String.join("\n", items);
        }
        String paragraph = inline(String.join(" ", lines.stream().map(line -> line.replaceFirst("^>\\s?", "")).toList()));
        return meaningful(paragraph) && !sameWords(paragraph, name) && !LINK_ROW.matcher(paragraph).matches() ? paragraph : null;
    }

    /** Le Markdown d'une ligne réduit à ce que la page du projet affiche : du texte, du gras, du code. */
    static String inline(String text) {
        String result = text
                // Liens automatiques, avant que les balises ne soient retirées
                .replaceAll("<(https?://[^>\\s]+)>", "$1")
                .replaceAll("(?i)<br\\s*/?>", " ")
                .replaceAll("<[^>]+>", "")
                // Badges : une image dans un lien, puis les images seules
                .replaceAll("\\[!\\[[^\\]]*\\]\\([^)]*\\)\\]\\([^)]*\\)", "")
                .replaceAll("\\[!\\[[^\\]]*\\](\\[[^\\]]*\\]|\\([^)]*\\))\\](\\[[^\\]]*\\]|\\([^)]*\\))", "")
                .replaceAll("!\\[[^\\]]*\\](\\([^)]*\\)|\\[[^\\]]*\\])", "")
                // Un lien devient son texte
                .replaceAll("\\[([^\\]]+)\\]\\([^)]*\\)", "$1")
                .replaceAll("\\[([^\\]]+)\\]\\[[^\\]]*\\]", "$1")
                .replaceAll("__([^_]+)__", "**$1**")
                // L'italique et le barré n'existent pas sur la page : leur texte reste
                .replaceAll("(?<![*\\w])\\*(?![*\\s])([^*\\n]+?)(?<!\\s)\\*(?![*\\w])", "$1")
                .replaceAll("(?<![_\\w])_(?![_\\s])([^_\\n]+?)(?<!\\s)_(?![_\\w])", "$1")
                .replaceAll("~~([^~]+)~~", "$1")
                .replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&amp;", "&");
        return result.replaceAll("\\s+", " ").strip();
    }

    // Au moins trois lettres : pas un reste de ponctuation ou d'emoji
    private static boolean meaningful(String text) {
        return text.codePoints().filter(Character::isLetter).limit(3).count() >= 3;
    }

    // « Lagos Transit » et « lagos-transit » disent la même chose
    private static boolean sameWords(String text, String name) {
        if (name == null) {
            return false;
        }
        return letters(text).equals(letters(name));
    }

    private static String letters(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
    }

    // Coupé au dernier mot qui tient, suivi de « … »
    private static String truncate(String text) {
        int cut = text.lastIndexOf(' ', MAX_CHARS - 1);
        return text.substring(0, cut > MAX_CHARS / 2 ? cut : MAX_CHARS - 1).strip() + "…";
    }
}
