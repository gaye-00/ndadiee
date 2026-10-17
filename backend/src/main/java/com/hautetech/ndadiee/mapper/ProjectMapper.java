package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.hautetech.ndadiee.common.MediaUrls;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface ProjectMapper {

    // memberCount, openings, team, starredByMe et myMembershipStatus sont renseignés par ProjectService,
    // en une requête pour toute une liste de projets
    @Mapping(target = "logoUrl", qualifiedByName = "media")
    @Mapping(target = "coverUrl", qualifiedByName = "media")
    @Mapping(target = "coverThumbnailUrl", expression = "java(thumbnail(project))")
    @Mapping(target = "openings", ignore = true)
    @Mapping(target = "team", ignore = true)
    ProjectResponse toResponse(Project project);

    ProjectMemberResponse toMemberResponse(ProjectMember member);

    // Le projet n'est renseigné que dans la liste des annonces (ProjectOpeningService)
    @Mapping(target = "project", ignore = true)
    ProjectOpeningResponse toOpeningResponse(ProjectOpening opening);

    @Mapping(target = "coverThumbnailUrl", expression = "java(thumbnail(project))")
    ProjectBriefResponse toBrief(Project project);

    @Named("media")
    default String media(String url) {
        return MediaUrls.absolute(url);
    }

    // Sans miniature, la couverture en tient lieu
    default String thumbnail(Project project) {
        return media(project.getCoverThumbnailUrl() != null ? project.getCoverThumbnailUrl() : project.getCoverUrl());
    }
}
