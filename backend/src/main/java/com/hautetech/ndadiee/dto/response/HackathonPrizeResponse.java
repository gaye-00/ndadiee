package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonPrizeResponse {

    private String title;
    private String reward;
}
