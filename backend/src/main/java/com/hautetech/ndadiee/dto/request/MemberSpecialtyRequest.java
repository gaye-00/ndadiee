package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO permettant de définir ou de modifier la spécialité
 * d'un membre au sein d'une équipe de projet.
 *
 * La spécialité est représentée par une valeur de l'énumération
 * TeamRole. Si aucune valeur n'est fournie, le membre peut ne pas
 * avoir de spécialité attribuée, selon la logique métier.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberSpecialtyRequest {

    /**
     * Spécialité ou fonction exercée par le membre dans l'équipe,
     * par exemple le développement mobile ou la data, selon
     * les valeurs disponibles dans l'énumération TeamRole.
     *
     * Ce champ est facultatif : aucune annotation ne le rend obligatoire.
     */
    private TeamRole specialty;
}
