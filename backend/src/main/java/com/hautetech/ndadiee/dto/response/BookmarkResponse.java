package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BookmarkResponse {

    private Long questionId;

    // Le sujet est-il dans la liste de lecture du membre, après l'opération ?
    private boolean bookmarked;

    // Sujets dans sa liste de lecture
    private long savedCount;
}
