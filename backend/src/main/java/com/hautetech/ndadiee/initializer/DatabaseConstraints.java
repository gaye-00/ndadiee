package com.hautetech.ndadiee.initializer;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les règles de la base que les entités ne savent pas décrire. Le schéma vient des entités (Hibernate) : tables, index,
 * index partiels (@Index(options = "where …")), contraintes uniques et CHECK. Un index unique partiel, lui, devient une
 * contrainte UNIQUE dans le CREATE TABLE, où PostgreSQL refuse la clause WHERE : il est créé ici, au démarrage, avant
 * les données (InitializerNdadiee). Chaque instruction peut être rejouée sans effet.
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
