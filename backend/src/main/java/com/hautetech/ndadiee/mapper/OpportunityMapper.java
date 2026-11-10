package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.OpportunityResponse;
import com.hautetech.ndadiee.model.opportunity.Opportunity;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface OpportunityMapper {

    // Un lien de candidature fictif (domaine réservé, comme les offres de démonstration) ne mènerait nulle part : pas de lien
    @Mapping(target = "applyUrl",
            expression = "java(com.hautetech.ndadiee.common.ReservedDomains.isDeadLink(opportunity.getApplyUrl()) ? null : opportunity.getApplyUrl())")
    OpportunityResponse toResponse(Opportunity opportunity);
}
