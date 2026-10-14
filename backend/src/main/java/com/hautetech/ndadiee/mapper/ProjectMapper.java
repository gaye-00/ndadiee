package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;

import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface ProjectMapper {

    // memberCount, starredByMe et myMembershipStatus sont renseignés par ProjectService
    ProjectResponse toResponse(Project project);

    ProjectMemberResponse toMemberResponse(ProjectMember member);
}
