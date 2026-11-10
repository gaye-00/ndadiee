package com.hautetech.ndadiee.common;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Les domaines réservés aux exemples et aux tests (RFC 2606, RFC 6761) : example.com, .test, .invalid, localhost…
 * Ils n'appartiennent à personne ; les données de démonstration s'en servent (adresses des comptes, dépôts, démos).
 * Un e-mail n'y arrive jamais, un lien n'y mène nulle part.
 */
public final class ReservedDomains {

    private static final Pattern RESERVED = Pattern.compile("^(?:.+\\.)?(?:example\\.(?:com|net|org)|example|test|invalid|localhost)$");

    private ReservedDomains() {
    }

    /** « example.com », « demo.example », « api.test »… ; la casse ne compte pas. */
    public static boolean isReserved(String domain) {
        return domain != null && RESERVED.matcher(domain.strip().toLowerCase(Locale.ROOT)).matches();
    }

    /** Un lien qui ne mène nulle part : sur un domaine réservé, ou sans domaine lisible. Faux pour un lien vide. */
    public static boolean isDeadLink(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        try {
            String host = new URI(url.strip()).getHost();
            return host == null || isReserved(host);
        } catch (URISyntaxException e) {
            return true;
        }
    }
}
