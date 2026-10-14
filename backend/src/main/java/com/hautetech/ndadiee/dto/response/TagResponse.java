package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TagResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private int usageCount;

    // Renseigné uniquement pour un membre connecté
    private Boolean followedByMe;
}
