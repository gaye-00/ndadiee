package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.HackathonBriefResponse;
import com.hautetech.ndadiee.dto.response.HackathonResponse;
import com.hautetech.ndadiee.dto.response.HackathonTeamResponse;
import com.hautetech.ndadiee.model.hackathon.Hackathon;
import com.hautetech.ndadiee.model.hackathon.HackathonTeam;

@Mapper(config = MapperConfiguration.class, uses = { TagMapper.class, ProjectMapper.class })
public interface HackathonMapper {

    // status, registrationOpen, teamCount, openSeats, rolesSought, teams et myTeam dépendent de l'heure
    // et des équipes : renseignés par HackathonService, en quelques requêtes pour toute une liste
    @Mapping(target = "teams", ignore = true)
    HackathonResponse toResponse(Hackathon hackathon);

    HackathonBriefResponse toBrief(Hackathon hackathon);

    // memberCount, members et openings sont renseignés par HackathonService
    @Mapping(target = "registeredAt", source = "createdAt")
    @Mapping(target = "members", ignore = true)
    @Mapping(target = "openings", ignore = true)
    HackathonTeamResponse toTeamResponse(HackathonTeam team);
}
