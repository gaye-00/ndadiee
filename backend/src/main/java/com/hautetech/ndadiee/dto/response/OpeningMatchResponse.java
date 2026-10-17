package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Compatibilité du membre connecté avec un rôle recherché : un score de 1 à 99, et les compétences de
 * son profil qui l'expliquent (« React · TypeScript »). Voir OpeningMatcher.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OpeningMatchResponse {

    private int score;
    private List<String> skills;
}
