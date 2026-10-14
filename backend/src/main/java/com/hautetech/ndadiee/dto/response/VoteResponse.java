package com.hautetech.ndadiee.dto.response;

import com.hautetech.ndadiee.model.ContentType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VoteResponse {

    private ContentType targetType;
    private Long targetId;

    // Vote du membre après l'opération : +1, -1, ou 0 s'il a retiré son vote
    private int value;

    // Nouveau score du contenu (nombre d'étoiles pour un projet)
    private int score;
}
