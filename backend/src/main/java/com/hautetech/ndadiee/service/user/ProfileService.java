package com.hautetech.ndadiee.service.user;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.CollaboratorResponse;
import com.hautetech.ndadiee.dto.response.ContributionDayResponse;
import com.hautetech.ndadiee.dto.response.MemberProjectResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.ProjectBriefResponse;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;

/**
 * Ce que le profil public d'un développeur montre en plus de sa fiche (UserService.getProfile) : ses projets, les
 * membres avec qui il a fait équipe, et ses contributions de l'année. Design 3F.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProfileService {

    // Coéquipiers montrés au plus, et projets en commun nommés pour chacun
    private static final int MAX_COLLABORATORS = 8;
    private static final int NAMED_PROJECTS = 2;
    // La carte des contributions couvre 53 semaines : l'année, et le début de la semaine où elle commence
    private static final int ACTIVITY_DAYS = 371;

    private final UserService userService;
    private final ProjectService projectService;
    private final ProjectMemberRepository projectMemberRepository;
    private final DeveloperRepository developerRepository;
    private final UserMapper userMapper;

    /** Un projet en commun avec un coéquipier */
    private record SharedProject(Long id, String name, String slug, int stars) {
    }

    /**
     * Les projets dont le développeur fait partie, avec sa place dans chaque équipe : ceux qu'il porte d'abord, puis
     * les plus étoilés. Un projet masqué n'y reste que pour lui et les admins, comme sur la page du projet.
     */
    public PageResponse<MemberProjectResponse> getProjects(String username, Long viewerId, Pageable pageable) {
        Developer developer = userService.findDeveloperByUsernameOrThrow(username);
        boolean withHidden = userService.canSeeHidden(viewerId, developer.getId());
        // L'ordre est celui de la requête : on ne garde que la pagination demandée
        Page<ProjectMember> teams = projectMemberRepository.findTeamsOf(developer.getId(), MemberStatus.ACCEPTED,
                ProjectRole.OWNER, withHidden, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));

        List<ProjectMember> memberships = teams.getContent();
        List<ProjectResponse> projects = projectService.toResponses(
                memberships.stream().map(ProjectMember::getProject).toList(), viewerId);
        List<MemberProjectResponse> content = IntStream.range(0, memberships.size())
                .mapToObj(index -> MemberProjectResponse.builder()
                        .project(projects.get(index))
                        .role(memberships.get(index).getRole())
                        .specialty(memberships.get(index).getSpecialty())
                        .joinedAt(memberships.get(index).getCreatedAt())
                        .build())
                .toList();
        return PageResponse.from(teams, content);
    }

    /**
     * Les membres avec qui le développeur a fait équipe sur ses projets visibles : ceux des projets en commun les plus
     * nombreux d'abord, puis des plus étoilés. Deux requêtes en tout.
     */
    public List<CollaboratorResponse> getCollaborators(String username) {
        Developer developer = userService.findDeveloperByUsernameOrThrow(username);
        Map<Long, List<SharedProject>> sharedByMember = projectMemberRepository
                .findTeammates(developer.getId(), MemberStatus.ACCEPTED).stream()
                .collect(Collectors.groupingBy(row -> (Long) row[0], Collectors.mapping(
                        row -> new SharedProject((Long) row[1], (String) row[2], (String) row[3], (Integer) row[4]),
                        Collectors.toCollection(ArrayList::new))));

        Comparator<SharedProject> mostStarred = Comparator.comparingInt(SharedProject::stars).reversed()
                .thenComparing(SharedProject::id);
        sharedByMember.values().forEach(projects -> projects.sort(mostStarred));
        List<Long> ranked = sharedByMember.keySet().stream()
                .sorted(Comparator.<Long>comparingInt(id -> sharedByMember.get(id).size()).reversed()
                        .thenComparing(id -> sharedByMember.get(id).get(0), mostStarred)
                        .thenComparing(Function.identity()))
                .limit(MAX_COLLABORATORS)
                .toList();
        Map<Long, Developer> members = developerRepository.findAllById(ranked).stream()
                .collect(Collectors.toMap(Developer::getId, Function.identity()));

        return ranked.stream()
                .filter(members::containsKey)
                .map(id -> CollaboratorResponse.builder()
                        .user(userMapper.toSummary(members.get(id)))
                        .sharedProjectCount(sharedByMember.get(id).size())
                        .projects(sharedByMember.get(id).stream()
                                .limit(NAMED_PROJECTS)
                                .map(project -> ProjectBriefResponse.builder()
                                        .id(project.id())
                                        .name(project.name())
                                        .slug(project.slug())
                                        .build())
                                .toList())
                        .build())
                .toList();
    }

    /**
     * Les contributions du développeur jour par jour (UTC) sur les 53 dernières semaines, les jours sans rien en
     * moins : sujets, réponses, commentaires, articles publiés, projets lancés, notes de devlog et retours donnés.
     */
    public List<ContributionDayResponse> getActivity(String username) {
        Developer developer = userService.findDeveloperByUsernameOrThrow(username);
        Instant since = LocalDate.now(ZoneOffset.UTC).minusDays(ACTIVITY_DAYS - 1L).atStartOfDay(ZoneOffset.UTC).toInstant();
        return developerRepository.findContributionDates(developer.getId(), since, ArticleStatus.PUBLISHED).stream()
                .collect(Collectors.groupingBy(at -> LocalDate.ofInstant(at, ZoneOffset.UTC), TreeMap::new, Collectors.counting()))
                .entrySet().stream()
                .map(day -> new ContributionDayResponse(day.getKey(), day.getValue()))
                .toList();
    }
}
