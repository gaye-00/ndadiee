package com.hautetech.ndadiee.service.project;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.response.OpeningMatchResponse;
import com.hautetech.ndadiee.model.project.TeamRole;

/**
 * Compatibilité d'un membre avec un rôle recherché (design 3D : « 91 % avec ton profil »), d'après les
 * compétences de son profil : celles du métier (un dev mobile connaît Flutter, Kotlin ou React Native)
 * et la stack du projet.
 *
 * Chaque compétence du métier comble 45 % de l'écart qui reste, chaque technologie du projet 30 % : deux
 * compétences du métier font 70 %, plus une technologie du projet 79 %, trois et deux 92 %. Le score ne
 * monte jamais à 100 : personne ne correspond parfaitement à une annonce. Il dit aussi pourquoi : les
 * compétences qui comptent, celles du projet d'abord.
 */
@Component
public class OpeningMatcher {

    private static final double ROLE_WEIGHT = 0.45;
    private static final double STACK_WEIGHT = 0.30;
    private static final int MAX_SCORE = 99;
    // Compétences citées pour expliquer le score
    private static final int REASONS = 3;

    // Compétences de chaque métier, en minuscules : les noms des tags des profils
    private static final Map<TeamRole, Set<String>> ROLE_SKILLS = new EnumMap<>(Map.ofEntries(
            Map.entry(TeamRole.FRONTEND, Set.of("react", "vue.js", "vue", "svelte", "angular", "next.js", "typescript",
                    "javascript", "css", "html", "tailwind css", "performance")),
            Map.entry(TeamRole.BACKEND, Set.of("java", "spring boot", "kotlin", "go", "node.js", "python", "django",
                    "php", "laravel", "postgresql", "graphql", "redis", "api")),
            Map.entry(TeamRole.MOBILE, Set.of("react native", "flutter", "dart", "kotlin", "swift", "android", "ios",
                    "react", "typescript", "firebase", "offline")),
            Map.entry(TeamRole.DESIGN, Set.of("figma", "ui", "ux", "ui design", "design system", "css", "accessibility")),
            Map.entry(TeamRole.DATA, Set.of("python", "sql", "postgresql", "pandas", "machine learning", "nlp",
                    "open data", "gtfs", "data")),
            Map.entry(TeamRole.DEVOPS, Set.of("docker", "kubernetes", "terraform", "devops", "linux", "aws", "ci/cd",
                    "ansible")),
            Map.entry(TeamRole.SECURITY, Set.of("security", "oauth", "cryptography", "devsecops", "linux")),
            Map.entry(TeamRole.PAYMENTS, Set.of("mobile money", "m-pesa", "momo", "ussd", "fintech", "api", "java",
                    "kotlin")),
            Map.entry(TeamRole.L10N, Set.of("wolof", "yoruba", "yorùbá", "hausa", "igbo", "kiswahili", "amharic",
                    "tigrinya", "arabic", "i18n", "nlp")),
            Map.entry(TeamRole.DOCS, Set.of("markdown", "docusaurus", "documentation", "technical writing")),
            Map.entry(TeamRole.PRODUCT, Set.of("product", "ux", "agile", "user research")),
            Map.entry(TeamRole.EMBEDDED, Set.of("iot", "esp32", "micropython", "arduino", "c", "c++", "lora",
                    "embedded")),
            Map.entry(TeamRole.QA, Set.of("testing", "qa", "playwright", "cypress", "junit", "android"))));

    /**
     * @param skills les compétences du membre (noms des tags de son profil)
     * @param stack les technologies du projet (noms de ses tags)
     * @return vide si aucune de ses compétences ne compte pour ce rôle
     */
    public Optional<OpeningMatchResponse> match(Collection<String> skills, TeamRole role, Collection<String> stack) {
        Set<String> roleSkills = ROLE_SKILLS.getOrDefault(role, Set.of());
        Set<String> projectStack = stack.stream().map(OpeningMatcher::normalize).collect(Collectors.toSet());

        // Une compétence par nom, telle que le profil l'écrit
        Map<String, String> mine = new LinkedHashMap<>();
        skills.forEach(skill -> mine.putIfAbsent(normalize(skill), skill.trim()));

        int roleHits = 0;
        int stackHits = 0;
        List<String> both = new ArrayList<>();
        List<String> stackOnly = new ArrayList<>();
        List<String> roleOnly = new ArrayList<>();
        for (Map.Entry<String, String> skill : mine.entrySet()) {
            boolean forRole = roleSkills.contains(skill.getKey());
            boolean inStack = projectStack.contains(skill.getKey());
            roleHits += forRole ? 1 : 0;
            stackHits += inStack ? 1 : 0;
            if (forRole && inStack) {
                both.add(skill.getValue());
            } else if (inStack) {
                stackOnly.add(skill.getValue());
            } else if (forRole) {
                roleOnly.add(skill.getValue());
            }
        }

        double gap = Math.pow(1 - ROLE_WEIGHT, roleHits) * Math.pow(1 - STACK_WEIGHT, stackHits);
        int score = (int) Math.min(MAX_SCORE, Math.round(100 * (1 - gap)));
        if (score == 0) {
            return Optional.empty();
        }

        // Par ordre alphabétique dans chaque groupe : le profil n'ordonne pas ses compétences
        List<String> reasons = new ArrayList<>();
        for (List<String> group : List.of(both, stackOnly, roleOnly)) {
            group.sort(String.CASE_INSENSITIVE_ORDER);
            reasons.addAll(group);
        }
        return Optional.of(OpeningMatchResponse.builder()
                .score(score)
                .skills(reasons.stream().limit(REASONS).toList())
                .build());
    }

    private static String normalize(String name) {
        return name.trim().toLowerCase(Locale.ROOT);
    }
}
