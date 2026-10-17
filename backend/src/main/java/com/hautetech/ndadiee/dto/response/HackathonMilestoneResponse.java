package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonMilestoneResponse {

    private Instant scheduledAt;
    private String label;
}
