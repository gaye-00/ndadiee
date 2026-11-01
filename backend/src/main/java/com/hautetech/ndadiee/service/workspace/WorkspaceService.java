package com.hautetech.ndadiee.service.workspace;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.WorkspaceMemberResponse;
import com.hautetech.ndadiee.dto.response.WorkspacePulseResponse;
import com.hautetech.ndadiee.dto.response.WorkspaceResponse;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.workspace.Sprint;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.SprintRepository;
import com.hautetech.ndadiee.repository.TaskRepository;
import com.hautetech.ndadiee.repository.TeamMessageRepository;

import lombok.RequiredArgsConstructor;

/**
 * L'espace d'équipe d'un projet (design 3E) : ce que montrent l'en-tête et les onglets, et le pouls qui le garde à jour.
 *
 * Le pouls (pulse) est demandé toutes les quelques secondes par chaque onglet ouvert. Il note que le membre est là, et
 * rend qui est en ligne et la révision de chaque partie de l'espace : on ne relit que ce qui a changé. Pas de connexion
 * permanente à tenir : il passe partout, même derrière un proxy d'entreprise ou un réseau mobile qui coupe souvent.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class WorkspaceService {

    // En ligne : passé par l'espace dans la dernière minute. Le pouls n'écrit qu'une fois toutes les 20 secondes.
    static final Duration ONLINE_WINDOW = Duration.ofSeconds(60);
    static final Duration PRESENCE_WRITE_INTERVAL = Duration.ofSeconds(20);

    // Le porteur, puis les mainteneurs, puis les contributeurs
    private static final Comparator<ProjectMember> TEAM_ORDER = Comparator
            .comparing((ProjectMember member) -> member.getRole() == ProjectRole.OWNER ? 0 : member.getRole() == ProjectRole.MAINTAINER ? 1 : 2)
            .thenComparing(ProjectMember::getCreatedAt)
            .thenComparing(ProjectMember::getId);

    private final WorkspaceAccess access;
    private final SprintService sprintService;
    private final ProjectMemberRepository memberRepository;
    private final ProjectOpeningRepository openingRepository;
    private final PullRequestRepository pullRequestRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final TeamMessageRepository messageRepository;
    private final ProjectMapper projectMapper;
    private final UserMapper userMapper;

    /** L'en-tête et les onglets : le projet, l'équipe et qui est là, le sprint en cours, ce qui attend. */
    @Transactional(readOnly = true)
    public WorkspaceResponse overview(String slug, Long userId) {
        Project project = access.member(slug, userId);
        Long projectId = project.getId();
        boolean manager = access.isManager(project, userId);

        // Qui est là : ceux dont le pouls bat, et le membre qui ouvre l'espace en ce moment
        Set<Long> online = new HashSet<>(memberRepository.findPresentUserIds(projectId, MemberStatus.ACCEPTED,
                Instant.now().minus(ONLINE_WINDOW)));
        online.add(userId);
        List<ProjectMember> team = memberRepository.findWithUserByProjectIdsAndStatus(List.of(projectId), MemberStatus.ACCEPTED)
                .stream()
                .sorted(TEAM_ORDER)
                .toList();
        ProjectMember me = team.stream().filter(member -> member.getUser().getId().equals(userId)).findFirst().orElse(null);

        return WorkspaceResponse.builder()
                .project(projectMapper.toBrief(project))
                // Un porteur a toujours sa participation ; à défaut (données d'avant), il reste le porteur
                .myRole(me == null ? ProjectRole.OWNER : me.getRole())
                .mySpecialty(me == null ? null : me.getSpecialty())
                .canManage(manager)
                .members(team.stream()
                        .map(member -> WorkspaceMemberResponse.builder()
                                .memberId(member.getId())
                                .user(userMapper.toSummary(member.getUser()))
                                .role(member.getRole())
                                .specialty(member.getSpecialty())
                                .joinedAt(member.getCreatedAt())
                                .online(online.contains(member.getUser().getId()))
                                .build())
                        .toList())
                .sprint(sprintService.current(project).orElse(null))
                .lastSprintNumber(sprintService.lastNumber(project))
                .openPullRequests(pullRequestRepository.countByProjectIdAndStatus(projectId, PullRequestStatus.OPEN))
                .openRoles(openingRepository.findByProjectIdInAndOpenTrueOrderByIdAsc(List.of(projectId)).size())
                .pendingApplications(manager ? memberRepository.countByProjectIdAndStatus(projectId, MemberStatus.PENDING) : 0)
                .build();
    }

    /** Le membre est là : qui d'autre l'est, et ce qui a changé dans l'espace. */
    public WorkspacePulseResponse pulse(String slug, Long userId) {
        Project project = access.member(slug, userId);
        Long projectId = project.getId();
        Instant now = Instant.now();
        memberRepository.touchPresence(projectId, userId, MemberStatus.ACCEPTED, now, now.minus(PRESENCE_WRITE_INTERVAL));

        // Le sprint en cours fait partie de l'équipe : l'ouvrir ou le clore change l'en-tête de chacun
        long sprint = sprintRepository.findByProjectIdAndClosedAtIsNull(projectId).map(Sprint::getId).orElse(0L);
        return WorkspacePulseResponse.builder()
                .online(memberRepository.findPresentUserIds(projectId, MemberStatus.ACCEPTED, now.minus(ONLINE_WINDOW)))
                .board(taskRepository.findRevision(projectId).token())
                .team(memberRepository.findRevision(projectId).token() + "-s" + sprint)
                .chat(messageRepository.findRevision(projectId).token())
                .build();
    }
}
