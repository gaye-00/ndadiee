package com.hautetech.ndadiee.service.github;

import java.util.regex.Pattern;

/**
 * Les étiquettes d'une issue « premier pas », pensée pour une première contribution : good first issue,
 * first-timers-only, beginner, starter… quelle que soit leur écriture.
 */
public final class StarterLabels {

    private static final Pattern STARTER = Pattern.compile(".*(good[ -]?first|first[ -]?timers?|beginner|starter).*",
            Pattern.CASE_INSENSITIVE);

    private StarterLabels() {
    }

    public static boolean isStarter(String label) {
        return label != null && STARTER.matcher(label).matches();
    }
}
