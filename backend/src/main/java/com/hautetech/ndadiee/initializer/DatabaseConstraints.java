package com.hautetech.ndadiee.initializer;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Vérifie les règles complémentaires au modèle JPA. Flyway possède le schéma versionné ; l'index unique partiel des
 * sprints ouverts est également inclus dans la migration initiale. La vérification idempotente conserve les bases
 * préexistantes et ne supprime aucune donnée.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseConstraints {

    private final JdbcTemplate jdbcTemplate;

    public void apply() {
        // Un seul sprint en cours par projet (Sprint, SprintService)
        jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_sprints_project_open ON sprints (project_id) WHERE closed_at IS NULL");
        log.info("[Init] Contraintes de la base vérifiées");
    }
}
