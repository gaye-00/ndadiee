package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.hautetech.ndadiee.model.opportunity.OpportunityType;
import com.hautetech.ndadiee.model.opportunity.WorkMode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OpportunityResponse {

    private Long id;
    private String title;
    private String description;
    private String companyName;
    private String companyLogoUrl;
    private OpportunityType type;
    private WorkMode workMode;
    private String country;
    private String city;
    private String salaryRange;
    private String applyUrl;
    private LocalDate deadline;
    private UserSummaryResponse postedBy;
    private List<TagResponse> tags;
    private boolean active;
    private Instant createdAt;
}
