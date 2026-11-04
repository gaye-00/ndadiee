package com.hautetech.ndadiee.service.dashboard;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.ApplicationReviewResponse;
import com.hautetech.ndadiee.dto.response.BuilderStatsResponse;
import com.hautetech.ndadiee.dto.response.DashboardProjectResponse;
import com.hautetech.ndadiee.dto.response.DashboardResponse;
import com.hautetech.ndadiee.dto.response.FeedbackCallResponse;
import com.hautetech.ndadiee.dto.response.FeedbackReviewResponse;
import com.hautetech.ndadiee.dto.response.HackathonBriefResponse;
import com.hautetech.ndadiee.dto.response.TeamActivityResponse;
import com.hautetech.ndadiee.dto.response.TeamActivityResponse.Type;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.mapper.HackathonMapper;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.Feedback;
import com.hautetech.ndadiee.model.project.FeedbackCall;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectGithubActivity;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.FeedbackRepository;
import com.hautetech.ndadiee.repository.HackathonTeamRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.project.OpeningMatcher;
import com.hautetech.ndadiee.service.review.ReviewService;

import lombok.RequiredArgsConstructor;

/**
 * L'atelier du membre connecté (design 3B) : tout ce qui le concerne aujourd'hui, en une requête.
 *
 * <ul>
 * <li>Ses projets : les équipes dont il fait partie (les plus vivantes d'abord), puis ses candidatures en
 * attente.</li>
 * <li>Ce qui attend sa décision : les candidatures reçues par les projets qu'il porte ou maintient.</li>
 * <li>Ce qui attend son avis : les demandes de retours d'autres projets, ceux qu'il a étoilés et ceux de sa
 * stack d'abord.</li>
 * <li>L'activité de ses équipes, sur quatre semaines : devlog, arrivées, annonces, retours, hackathons. Ses
 * propres gestes n'y sont pas ; les candidatures, seulement là où il les traite.</li>
 * <li>Sa réputation de bâtisseur.</li>
 * </ul>
 *
 * Tout se lit dans les données des projets : une poignée de requêtes, quel que soit le nombre d'équipes.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DashboardService {

    // Avatars d'une carte de projet
    private static final int TEAM_PREVIEW = 5;
    // Pull requests à relire montrées dans l'atelier ; demandes de retours proposées, parmi les plus récentes
    private static final int PULL_REQUESTS = 5;
    private static final int FEEDBACK_REQUESTS = 3;
    private static final int FEEDBACK_CANDIDATES = 15;
    // Le fil : quatre semaines, douze événements
    private static final Duration ACTIVITY_WINDOW = Duration.ofDays(28);
    private static final int ACTIVITY_SIZE = 12;
    // Un extrait du devlog ou d'un avis, dans le fil ; auteurs montrés en plus du dernier, pour un regroupement
    private static final int EXCERPT = 140;
    private static final int GROUP_PREVIEW = 3;

    private final DashboardQueries queries;
    private final DeveloperRepository developerRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectOpeningRepository openingRepository;
    private final HackathonTeamRepository hackathonTeamRepository;
    private final FeedbackRepository feedbackRepository;
    private final VoteService voteService;
    private final OpeningMatcher openingMatcher;
    private final ReviewService reviewService;
    private final ProjectMapper projectMapper;
    private final UserMapper userMapper;
    private final HackathonMapper hackathonMapper;

    public DashboardResponse get(Long userId) {
        Developer me = developerRepository.findById(userId).orElse(null);
        if (me == null) {
            // Un compte Admin n'a ni équipes ni profil de bâtisseur
            return DashboardResponse.builder()
                    .projects(List.of()).pullRequests(List.of()).applications(List.of()).feedbackRequests(List.of()).activity(List.of())
                    .stats(BuilderStatsResponse.builder().build())
                    .build();
        }

        List<ProjectMember> memberships = queries.memberships(userId);
        List<Long> teamIds = memberships.stream()
                .filter(member -> member.getStatus() == MemberStatus.ACCEPTED)
                .map(member -> member.getProject().getId())
                .toList();
        Set<Long> managedIds = memberships.stream()
                .filter(member -> member.getStatus() == MemberStatus.ACCEPTED)
                .filter(member -> member.getRole() == ProjectRole.OWNER || member.getRole() == ProjectRole.MAINTAINER)
                .map(member -> member.getProject().getId())
                .collect(Collectors.toSet());
        List<ProjectMember> applications = managedIds.isEmpty() ? List.of() : queries.pendingApplications(managedIds);

        return DashboardResponse.builder()
                .projects(projects(userId, memberships, teamIds, applications))
                .pullRequests(reviewService.awaitingReview(userId, PULL_REQUESTS))
                .applications(applications.stream().map(this::toApplication).toList())
                .feedbackRequests(feedbackRequests(me, teamIds))
                .activity(teamIds.isEmpty() ? List.of() : activity(userId, teamIds, applications))
                .stats(stats(me))
                .build();
    }

    // ==================== MES PROJETS ====================

    private List<DashboardProjectResponse> projects(Long userId, List<ProjectMember> memberships, List<Long> teamIds,
            List<ProjectMember> applications) {
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<Long> ids = memberships.stream().map(member -> member.getProject().getId()).toList();

        Map<Long, List<UserSummaryResponse>> teams = memberRepository.findWithUserByProjectIdsAndStatus(ids, MemberStatus.ACCEPTED)
                .stream()
                .collect(Collectors.groupingBy(member -> member.getProject().getId(),
                        Collectors.mapping(member -> userMapper.toSummary(member.getUser()), Collectors.toList())));
        Map<Long, Long> openSeats = openingRepository.findByProjectIdInAndOpenTrueOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(opening -> opening.getProject().getId(),
                        Collectors.summingLong(ProjectOpening::getSeats)));
        Map<Long, Long> pending = applications.stream()
                .collect(Collectors.groupingBy(member -> member.getProject().getId(), Collectors.counting()));
        Map<Long, ProjectGithubActivity> github = queries.github(ids).stream()
                .collect(Collectors.toMap(activity -> activity.getProject().getId(), Function.identity()));
        Map<Long, Object[]> releases = queries.latestReleases(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], Function.identity(), (first, second) -> first));
        Map<Long, Instant> lastDevlog = queries.latestDevlog(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Instant) row[1]));
        Map<Long, Long> feedback = teamIds.isEmpty() ? Map.of() : queries.feedbackReceived(teamIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        Map<Long, Long> reviewRequests = queries.reviewRequestsByProject(userId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        // Le hackathon à venir ou en cours de chaque projet : le plus proche, s'il y en a plusieurs
        Map<Long, HackathonBriefResponse> hackathons = hackathonTeamRepository.findCurrentByProjectIds(ids, Instant.now()).stream()
                .collect(Collectors.toMap(team -> team.getProject().getId(), team -> hackathonMapper.toBrief(team.getHackathon()),
                        (soonest, later) -> soonest));

        Comparator<DashboardProjectResponse> order = Comparator
                // Ses équipes d'abord, ses candidatures ensuite
                .comparing((DashboardProjectResponse project) -> project.getMyStatus() != MemberStatus.ACCEPTED)
                .thenComparing(DashboardProjectResponse::getLastActivityAt, Comparator.nullsLast(Comparator.reverseOrder()));

        return memberships.stream()
                .map(member -> {
                    Project project = member.getProject();
                    Long id = project.getId();
                    List<UserSummaryResponse> team = teams.getOrDefault(id, List.of());
                    ProjectGithubActivity repository = github.get(id);
                    Object[] release = releases.get(id);
                    boolean inTeam = member.getStatus() == MemberStatus.ACCEPTED;

                    DashboardProjectResponse response = DashboardProjectResponse.builder()
                            .id(id)
                            .name(project.getName())
                            .slug(project.getSlug())
                            .tagline(project.getTagline())
                            .coverThumbnailUrl(projectMapper.toBrief(project).getCoverThumbnailUrl())
                            .myStatus(member.getStatus())
                            .myRole(member.getRole())
                            .mySpecialty(member.getSpecialty())
                            .joinedAt(member.getCreatedAt())
                            .appliedTo(!inTeam && member.getOpening() != null ? member.getOpening().getTitle() : null)
                            .team(team.stream().limit(TEAM_PREVIEW).toList())
                            .memberCount(team.size())
                            .openSeats(openSeats.getOrDefault(id, 0L))
                            .pendingApplications(pending.getOrDefault(id, 0L))
                            .feedbackReceived(inTeam ? feedback.getOrDefault(id, 0L) : 0L)
                            .reviewRequests(reviewRequests.getOrDefault(id, 0L))
                            .hackathon(hackathons.get(id))
                            .build();

                    if (repository != null) {
                        List<Integer> weeks = repository.getCommitWeeks();
                        response.setCommitWeeks(weeks);
                        response.setCommitsThisWeek(weeks.isEmpty() ? 0 : weeks.get(weeks.size() - 1));
                    }
                    if (repository != null && repository.getLastRelease() != null) {
                        response.setLastRelease(repository.getLastRelease());
                        response.setLastReleaseAt(repository.getLastReleaseAt());
                    } else if (release != null) {
                        response.setLastRelease((String) release[1]);
                        response.setLastReleaseAt((Instant) release[2]);
                    }
                    response.setLastActivityAt(Stream.of(
                                    repository == null ? null : repository.getLastCommitAt(),
                                    lastDevlog.get(id),
                                    member.getCreatedAt())
                            .filter(Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null));
                    return response;
                })
                .sorted(order)
                .toList();
    }

    // ==================== À ÉTUDIER, À RELIRE ====================

    private ApplicationReviewResponse toApplication(ProjectMember member) {
        ProjectOpening opening = member.getOpening();
        Developer applicant = member.getUser();
        return ApplicationReviewResponse.builder()
                .memberId(member.getId())
                .applicant(userMapper.toSummary(applicant))
                .project(projectMapper.toBrief(member.getProject()))
                .openingId(opening == null ? null : opening.getId())
                .openingTitle(opening == null ? null : opening.getTitle())
                .role(opening == null ? null : opening.getRole())
                .motivation(member.getMotivation())
                .match(opening == null ? null : openingMatcher.match(
                        names(applicant.getSkills()), opening.getRole(), names(member.getProject().getTags())).orElse(null))
                .createdAt(member.getCreatedAt())
                .build();
    }

    /**
     * Les demandes de retours où son avis compte : hors de ses équipes, pas encore reçues de lui. Les projets
     * qu'il a étoilés d'abord, puis ceux qui partagent le plus de technologies avec son profil, puis les plus
     * récentes.
     */
    private List<FeedbackReviewResponse> feedbackRequests(Developer me, Collection<Long> teamIds) {
        List<FeedbackCall> candidates = queries.feedbackCallsFor(me.getId(), teamIds, FEEDBACK_CANDIDATES);
        if (candidates.isEmpty()) {
            return List.of();
        }
        List<Long> projectIds = candidates.stream().map(call -> call.getProject().getId()).distinct().toList();
        Set<Long> starred = voteService.getUserVotes(me.getId(), ContentType.PROJECT, projectIds).keySet();
        Set<String> skills = names(me.getSkills()).stream().map(DashboardService::normalize).collect(Collectors.toSet());

        record Candidate(FeedbackCall call, boolean starred, List<String> shared, int position) {
        }
        List<Candidate> ranked = new ArrayList<>();
        for (int position = 0; position < candidates.size(); position++) {
            FeedbackCall call = candidates.get(position);
            List<String> shared = call.getProject().getTags().stream()
                    .map(Tag::getName)
                    .filter(name -> skills.contains(normalize(name)))
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .toList();
            ranked.add(new Candidate(call, starred.contains(call.getProject().getId()), shared, position));
        }
        List<Candidate> chosen = ranked.stream()
                .sorted(Comparator.comparing((Candidate candidate) -> !candidate.starred())
                        .thenComparing(candidate -> -candidate.shared().size())
                        .thenComparingInt(Candidate::position))
                .limit(FEEDBACK_REQUESTS)
                .toList();

        Map<Long, Object[]> summaries = feedbackRepository
                .summarize(chosen.stream().map(candidate -> candidate.call().getId()).toList()).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], Function.identity()));
        return chosen.stream()
                .map(candidate -> {
                    FeedbackCallResponse call = projectMapper.toFeedbackCallResponse(candidate.call());
                    Object[] summary = summaries.get(call.getId());
                    call.setFeedbackCount(summary == null ? 0 : (Long) summary[1]);
                    call.setAverageRating(summary == null || summary[2] == null
                            ? null
                            : Math.round(((Number) summary[2]).doubleValue() * 10) / 10.0);
                    call.setGivenByMe(false);
                    return FeedbackReviewResponse.builder()
                            .project(projectMapper.toBrief(candidate.call().getProject()))
                            .call(call)
                            .starred(candidate.starred())
                            .sharedSkills(candidate.shared())
                            .build();
                })
                .toList();
    }

    // ==================== DANS TES ÉQUIPES ====================

    private List<TeamActivityResponse> activity(Long userId, List<Long> teamIds, List<ProjectMember> applications) {
        Instant since = Instant.now().minus(ACTIVITY_WINDOW);
        List<TeamActivityResponse> events = new ArrayList<>();

        queries.devlogSince(teamIds, since).forEach(entry -> events.add(event(
                entry.getVersion() != null ? Type.RELEASE : Type.DEVLOG, entry.getId(), entry.getCreatedAt(),
                entry.getAuthor(), entry.getProject())
                .subject(entry.getVersion())
                .body(excerpt(entry.getBody()))
                .build()));
        queries.joinsSince(teamIds, since).forEach(member -> events.add(event(
                Type.MEMBER_JOINED, member.getId(), member.getUpdatedAt(), member.getUser(), member.getProject())
                .role(member.getSpecialty())
                .build()));
        applications.stream()
                .filter(member -> member.getCreatedAt().isAfter(since))
                .forEach(member -> events.add(event(
                        Type.APPLICATION, member.getId(), member.getCreatedAt(), member.getUser(), member.getProject())
                        .subject(member.getOpening() == null ? null : member.getOpening().getTitle())
                        .role(member.getOpening() == null ? null : member.getOpening().getRole())
                        .build()));
        // Une annonce n'a pas d'auteur : c'est le porteur qui recrute. Les rôles publiés le même jour dans un
        // projet font un seul événement
        groupedBy(queries.openingsSince(teamIds, since),
                opening -> opening.getProject().getId() + "@" + opening.getCreatedAt().truncatedTo(ChronoUnit.DAYS))
                .forEach(group -> {
                    ProjectOpening latest = group.get(0);
                    events.add(event(Type.OPENING_PUBLISHED, latest.getId(), latest.getCreatedAt(),
                            latest.getProject().getOwner(), latest.getProject())
                            .subject(latest.getTitle())
                            .body(group.size() > 1
                                    ? group.stream().skip(1).map(ProjectOpening::getTitle).collect(Collectors.joining(" · "))
                                    : null)
                            .role(latest.getRole())
                            .count(group.size())
                            .build());
                });
        queries.feedbackCallsSince(teamIds, since).forEach(call -> events.add(event(
                Type.FEEDBACK_REQUESTED, call.getId(), call.getCreatedAt(), call.getAuthor(), call.getProject())
                .subject(call.getTitle())
                .build()));
        // Les avis reçus par une même demande font un seul événement : le plus récent, et combien d'autres
        groupedBy(queries.feedbackSince(teamIds, since).stream()
                        .filter(feedback -> !userId.equals(feedback.getAuthor().getId()))
                        .toList(),
                feedback -> feedback.getCall().getId())
                .forEach(group -> {
                    Feedback latest = group.get(0);
                    events.add(event(Type.FEEDBACK_GIVEN, latest.getId(), latest.getCreatedAt(), latest.getAuthor(),
                            latest.getCall().getProject())
                            .subject(latest.getCall().getTitle())
                            .body(excerpt(latest.getBody()))
                            .rating(latest.getRating())
                            .count(group.size())
                            .others(group.stream().skip(1)
                                    .map(feedback -> userMapper.toSummary(feedback.getAuthor()))
                                    .limit(GROUP_PREVIEW)
                                    .toList())
                            .build());
                });
        queries.pullRequestsOpenedSince(teamIds, since).forEach(pr -> events.add(event(
                Type.PR_OPENED, pr.getId(), pr.getCreatedAt(), pr.getAuthor(), pr.getProject())
                .subject(pr.getTitle())
                .number(pr.getNumber())
                .build()));
        // Une PR fusionnée n'a pas d'auteur de la fusion : c'est l'auteur de la PR qui voit son travail arriver
        queries.pullRequestsMergedSince(teamIds, since).forEach(pr -> events.add(event(
                Type.PR_MERGED, pr.getId(), pr.getMergedAt(), pr.getAuthor(), pr.getProject())
                .subject(pr.getTitle())
                .number(pr.getNumber())
                .build()));
        queries.verdictsSince(teamIds, since).forEach(review -> events.add(event(
                review.getState() == ReviewState.APPROVED ? Type.PR_APPROVED : Type.PR_CHANGES_REQUESTED, review.getId(),
                review.getSubmittedAt(), review.getReviewer(), review.getPullRequest().getProject())
                .subject(review.getPullRequest().getTitle())
                .number(review.getPullRequest().getNumber())
                .build()));
        queries.hackathonRegistrationsSince(teamIds, since).forEach(team -> events.add(event(
                Type.HACKATHON_REGISTERED, team.getId(), team.getCreatedAt(), team.getRegisteredBy(), team.getProject())
                .subject(team.getHackathon().getTitle())
                .hackathonSlug(team.getHackathon().getSlug())
                .build()));

        return events.stream()
                .filter(event -> event.getActor() == null || !userId.equals(event.getActor().getId()))
                .sorted(Comparator.comparing(TeamActivityResponse::getAt).reversed()
                        .thenComparing(TeamActivityResponse::getKey))
                .limit(ACTIVITY_SIZE)
                .toList();
    }

    private TeamActivityResponse.TeamActivityResponseBuilder event(Type type, Long id, Instant at, Developer actor, Project project) {
        return TeamActivityResponse.builder()
                .key(type.name() + "-" + id)
                .type(type)
                .at(at)
                .count(1)
                .others(List.of())
                .actor(actor == null ? null : userMapper.toSummary(actor))
                .project(projectMapper.toBrief(project));
    }

    // ==================== RÉPUTATION ====================

    private BuilderStatsResponse stats(Developer me) {
        Long id = me.getId();
        return BuilderStatsResponse.builder()
                .reputation(me.getReputation())
                .projectsLed(queries.count("SELECT COUNT(p) FROM Project p WHERE p.owner.id = :userId", id))
                .teamsJoined(queries.count("""
                        SELECT COUNT(m) FROM ProjectMember m
                        WHERE m.user.id = :userId AND m.status = com.hautetech.ndadiee.model.project.MemberStatus.ACCEPTED
                          AND m.role <> com.hautetech.ndadiee.model.project.ProjectRole.OWNER
                        """, id))
                .buildersWelcomed(queries.count("""
                        SELECT COUNT(m) FROM ProjectMember m
                        WHERE m.project.owner.id = :userId AND m.status = com.hautetech.ndadiee.model.project.MemberStatus.ACCEPTED
                          AND m.role <> com.hautetech.ndadiee.model.project.ProjectRole.OWNER
                        """, id))
                .feedbackGiven(queries.count("SELECT COUNT(f) FROM Feedback f WHERE f.author.id = :userId", id))
                .acceptedAnswers(queries.count("SELECT COUNT(a) FROM Answer a WHERE a.author.id = :userId AND a.accepted = true", id))
                .starsReceived(queries.count("SELECT COALESCE(SUM(p.starsCount), 0) FROM Project p WHERE p.owner.id = :userId", id))
                .mergedPullRequests(queries.count("""
                        SELECT COUNT(pr) FROM PullRequest pr
                        WHERE pr.author.id = :userId AND pr.status = com.hautetech.ndadiee.model.review.PullRequestStatus.MERGED
                        """, id))
                .reviewsGiven(queries.count("""
                        SELECT COUNT(r) FROM PullRequestReviewer r
                        WHERE r.reviewer.id = :userId AND r.state <> com.hautetech.ndadiee.model.review.ReviewState.REQUESTED
                        """, id))
                .build();
    }

    // ==================== HELPERS ====================

    // Les lignes regroupées par clé, chaque groupe dans l'ordre reçu (le plus récent d'abord)
    private static <T> Collection<List<T>> groupedBy(List<T> rows, Function<T, Object> key) {
        return rows.stream().collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.toList())).values();
    }

    private static List<String> names(Collection<Tag> tags) {
        return tags.stream().map(Tag::getName).toList();
    }

    private static String normalize(String name) {
        return name.trim().toLowerCase(Locale.ROOT);
    }

    // Le début d'un texte, coupé à un mot, sur une ligne
    private static String excerpt(String text) {
        if (text == null) {
            return null;
        }
        String flat = text.replaceAll("\\s+", " ").trim();
        if (flat.length() <= EXCERPT) {
            return flat;
        }
        int cut = flat.lastIndexOf(' ', EXCERPT);
        return flat.substring(0, cut > EXCERPT / 2 ? cut : EXCERPT).stripTrailing() + "…";
    }
}
