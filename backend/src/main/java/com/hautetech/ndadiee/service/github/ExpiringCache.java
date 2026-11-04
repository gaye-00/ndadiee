package com.hautetech.ndadiee.service.github;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Une petite mémoire des réponses de GitHub, pour ne pas redemander un dépôt qu'on vient de lire (le quota sans jeton
 * est de 60 requêtes par heure pour tout le serveur). Bornée : pleine, elle oublie les réponses expirées, puis tout.
 */
final class ExpiringCache<V> {

    private record Entry<V>(V value, Instant expiresAt) {
    }

    private final Map<String, Entry<V>> entries = new ConcurrentHashMap<>();
    private final Duration ttl;
    private final int maxEntries;
    private final Clock clock;

    ExpiringCache(Duration ttl, int maxEntries, Clock clock) {
        this.ttl = ttl;
        this.maxEntries = maxEntries;
        this.clock = clock;
    }

    /** La valeur gardée, ou celle que `load` va chercher (une erreur n'est pas gardée) */
    V get(String key, Supplier<V> load) {
        Instant now = clock.instant();
        Entry<V> entry = entries.get(key);
        if (entry != null && entry.expiresAt().isAfter(now)) {
            return entry.value();
        }
        V value = load.get();
        if (ttl.isZero()) {
            return value;
        }
        if (entries.size() >= maxEntries) {
            entries.values().removeIf(candidate -> !candidate.expiresAt().isAfter(now));
            if (entries.size() >= maxEntries) {
                entries.clear();
            }
        }
        entries.put(key, new Entry<>(value, now.plus(ttl)));
        return value;
    }
}
