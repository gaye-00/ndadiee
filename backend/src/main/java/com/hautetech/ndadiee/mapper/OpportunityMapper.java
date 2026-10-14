package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;

import com.hautetech.ndadiee.dto.response.OpportunityResponse;
import com.hautetech.ndadiee.model.opportunity.Opportunity;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface OpportunityMapper {

    OpportunityResponse toResponse(Opportunity opportunity);
}
