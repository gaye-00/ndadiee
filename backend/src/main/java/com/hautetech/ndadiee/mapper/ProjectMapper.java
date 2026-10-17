package com.hautetech.ndadiee.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.hautetech.ndadiee.common.MediaUrls;
import com.hautetech.ndadiee.dto.response.DevlogEntryResponse;
import com.hautetech.ndadiee.dto.response.FeedbackCallResponse;
import com.hautetech.ndadiee.dto.response.FeedbackResponse;
import com.hautetech.ndadiee.dto.response.GithubActivityResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectMediaResponse;
import com.hautetech.ndadiee.dto.response.ProjectMemberResponse;
import com.hautetech.ndadiee.dto.response.ProjectOpeningResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.model.project.DevlogEntry;
import com.hautetech.ndadiee.model.project.Feedback;
import com.hautetech.ndadiee.model.project.FeedbackCall;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectGithubActivity;
import com.hautetech.ndadiee.model.project.ProjectMedia;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface ProjectMapper {

    // memberCount, openings, team, starredByMe et myMembershipStatus sont renseignés par ProjectService,
    // en une requête pour toute une liste de projets ; la galerie et l'activité GitHub, sur la page du projet
    @Mapping(target = "logoUrl", qualifiedByName = "media")
    @Mapping(target = "coverUrl", qualifiedByName = "media")
    @Mapping(target = "coverThumbnailUrl", expression = "java(thumbnail(project))")
    @Mapping(target = "openings", ignore = true)
    @Mapping(target = "team", ignore = true)
    @Mapping(target = "gallery", ignore = true)
    @Mapping(target = "github", ignore = true)
    ProjectResponse toResponse(Project project);

    @Mapping(target = "openingId", source = "opening.id")
    ProjectMemberResponse toMemberResponse(ProjectMember member);

    // Le projet n'est renseigné que dans la liste des annonces (ProjectOpeningService) ; les candidatures
    // et la compatibilité, sur la page du projet (ProjectService)
    @Mapping(target = "project", ignore = true)
    @Mapping(target = "applicants", ignore = true)
    @Mapping(target = "match", ignore = true)
    @Mapping(target = "appliedByMe", ignore = true)
    ProjectOpeningResponse toOpeningResponse(ProjectOpening opening);

    // Technologies et participation du membre connecté : renseignées dans la liste des annonces (ProjectOpeningService)
    @Mapping(target = "coverThumbnailUrl", expression = "java(thumbnail(project))")
    @Mapping(target = "tags", ignore = true)
    @Mapping(target = "myMembershipStatus", ignore = true)
    ProjectBriefResponse toBrief(Project project);

    @Mapping(target = "url", qualifiedByName = "media")
    @Mapping(target = "thumbnailUrl", qualifiedByName = "media")
    ProjectMediaResponse toMediaResponse(ProjectMedia media);

    @Mapping(target = "commitsThisWeek", expression = "java(thisWeek(activity))")
    GithubActivityResponse toGithubResponse(ProjectGithubActivity activity);

    DevlogEntryResponse toDevlogResponse(DevlogEntry entry);

    // Retours comptés et « déjà donné » : renseignés par FeedbackService
    @Mapping(target = "feedbackCount", ignore = true)
    @Mapping(target = "averageRating", ignore = true)
    @Mapping(target = "givenByMe", ignore = true)
    FeedbackCallResponse toFeedbackCallResponse(FeedbackCall call);

    FeedbackResponse toFeedbackResponse(Feedback feedback);

    @Named("media")
    default String media(String url) {
        return MediaUrls.absolute(url);
    }

    // Sans miniature, la couverture en tient lieu
    default String thumbnail(Project project) {
        return media(project.getCoverThumbnailUrl() != null ? project.getCoverThumbnailUrl() : project.getCoverUrl());
    }

    // La semaine en cours est la dernière du relevé
    default int thisWeek(ProjectGithubActivity activity) {
        List<Integer> weeks = activity.getCommitWeeks();
        return weeks == null || weeks.isEmpty() ? 0 : weeks.get(weeks.size() - 1);
    }
}
