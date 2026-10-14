package com.hautetech.ndadiee.dto.response;

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
    private String name;
    private String description;
    private String iconUrl;
    private String criteria;
}
