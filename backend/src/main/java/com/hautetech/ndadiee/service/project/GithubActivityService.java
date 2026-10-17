package com.hautetech.ndadiee.service.project;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectGithubActivity;
import com.hautetech.ndadiee.repository.ProjectGithubActivityRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Activité GitHub des projets : chaque synchronisation remplace le relevé du projet. La page du projet
 * l'affiche (ProjectResponse.github). Pour l'instant, seules les données de démonstration en écrivent.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class GithubActivityService {

    // Semaines gardées dans le relevé des commits
    static final int WEEKS = 12;

    private final ProjectGithubActivityRepository activityRepository;
    private final ProjectService projectService;

    /**
     * Ce que GitHub dit d'un dépôt à un instant donné.
     *
     * @param commitWeeks commits par semaine, de la plus ancienne à la semaine en cours (les 12 dernières sont gardées)
     */
    public record Snapshot(int stars, int forks, int openIssues, int goodFirstIssues, int contributors,
            List<Integer> commitWeeks, String lastRelease, Instant lastReleaseAt, Instant lastCommitAt, Instant syncedAt) {
    }

    public void record(Long projectId, Snapshot snapshot) {
        Project project = projectService.findProjectOrThrow(projectId);
        ProjectGithubActivity activity = activityRepository.findByProjectId(projectId)
                .orElseGet(() -> ProjectGithubActivity.builder().project(project).build());

        List<Integer> weeks = snapshot.commitWeeks() == null ? List.of() : snapshot.commitWeeks();
        activity.setStars(snapshot.stars());
        activity.setForks(snapshot.forks());
        activity.setOpenIssues(snapshot.openIssues());
        activity.setGoodFirstIssues(snapshot.goodFirstIssues());
        activity.setContributors(snapshot.contributors());
        activity.setCommitWeeks(new ArrayList<>(weeks.subList(Math.max(0, weeks.size() - WEEKS), weeks.size())));
        activity.setLastRelease(snapshot.lastRelease());
        activity.setLastReleaseAt(snapshot.lastReleaseAt());
        activity.setLastCommitAt(snapshot.lastCommitAt());
        activity.setSyncedAt(snapshot.syncedAt() == null ? Instant.now() : snapshot.syncedAt());

        activityRepository.save(activity);
        log.info("[GitHub] Activité du projet {} relevée", projectId);
    }
}
