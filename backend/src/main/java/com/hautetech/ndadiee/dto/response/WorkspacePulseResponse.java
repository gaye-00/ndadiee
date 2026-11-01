package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Le pouls de l'espace d'équipe, demandé toutes les quelques secondes par chaque onglet ouvert : qui est là, et la
 * révision du tableau, de l'équipe et de la discussion. Quelques dizaines d'octets : on ne relit que ce qui a changé.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WorkspacePulseResponse {

    // Les membres en ligne
    private List<Long> online;

    // À comparer telles quelles : le tableau (ses tâches), l'équipe (membres, candidatures, sprint en cours) et la
    // discussion (messages, rendez-vous et leurs participants)
    private String board;
    private String team;
    private String chat;
}
