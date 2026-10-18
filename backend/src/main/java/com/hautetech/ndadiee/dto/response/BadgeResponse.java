package com.hautetech.ndadiee.dto.response;

import com.hautetech.ndadiee.model.badge.BadgeType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BadgeResponse {

    private Long id;
    // Le badge du catalogue (BadgeType), dont le frontend traduit le nom ; null pour un badge ajouté à la main
    private BadgeType type;
    private String name;
    private String description;
    private String iconUrl;
    private String criteria;
}
