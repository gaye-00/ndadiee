package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une issue que la pull request résout et fermera en fusionnant (« Closes #77 ») : la tâche à laquelle elle
 * répond (design 3C, « Tâche liée »).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LinkedIssueResponse {

    private int number;
    // null quand seul son numéro est connu
    private String title;
    // OPEN ou CLOSED ; null quand on ne le sait pas
    private String state;
    private List<String> labels;
    // Une issue « premier pas » (good first issue, beginner…) : pensée pour une première contribution
    private boolean starter;
    // L'issue sur GitHub ; null pour les données de démonstration
    private String url;
}
