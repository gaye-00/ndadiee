package com.hautetech.ndadiee.service.dashboard;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.hautetech.ndadiee.model.hackathon.HackathonTeam;
import com.hautetech.ndadiee.model.project.DevlogEntry;
import com.hautetech.ndadiee.model.project.Feedback;
import com.hautetech.ndadiee.model.project.FeedbackCall;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectGithubActivity;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestReviewer;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.ReviewState;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Les lectures de l'atelier (DashboardService), chacune pour tous les projets du membre à la fois. Elles
 * restent ici plutôt que dans les repositories de chaque entité : seul l'atelier s'en sert.
 */
@Repository
class DashboardQueries {

    // Activité du fil : par source, les plus récentes seulement
    private static final int PER_SOURCE = 20;

    @PersistenceContext
    private EntityManager em;

    /** Ses participations acceptées ou en attente, avec leur projet, son porteur et le rôle visé. */
    List<ProjectMember> memberships(Long userId) {
        return em.createQuery("""
                SELECT m FROM ProjectMember m JOIN FETCH m.project p JOIN FETCH p.owner LEFT JOIN FETCH m.opening
                WHERE m.user.id = :userId AND m.status IN :statuses
                ORDER BY m.createdAt DESC, m.id DESC
                """, ProjectMember.class)
                .setParameter("userId", userId)
                .setParameter("statuses", List.of(MemberStatus.ACCEPTED, MemberStatus.PENDING))
                .getResultList();
    }

    List<ProjectGithubActivity> github(Collection<Long> projectIds) {
        return em.createQuery("SELECT g FROM ProjectGithubActivity g WHERE g.project.id IN :ids", ProjectGithubActivity.class)
                .setParameter("ids", projectIds)
                .getResultList();
    }

    /** Dernière version du devlog de chaque projet : lignes [id du projet, version, date]. */
    List<Object[]> latestReleases(Collection<Long> projectIds) {
        return em.createQuery("""
                SELECT d.project.id, d.version, d.createdAt FROM DevlogEntry d
                WHERE d.project.id IN :ids AND d.version IS NOT NULL AND d.createdAt = (
                    SELECT MAX(o.createdAt) FROM DevlogEntry o WHERE o.project = d.project AND o.version IS NOT NULL)
                """, Object[].class)
                .setParameter("ids", projectIds)
                .getResultList();
    }

    /** Dernière entrée du devlog de chaque projet : lignes [id du projet, date]. */
    List<Object[]> latestDevlog(Collection<Long> projectIds) {
        return em.createQuery("""
                SELECT d.project.id, MAX(d.createdAt) FROM DevlogEntry d
                WHERE d.project.id IN :ids GROUP BY d.project.id
                """, Object[].class)
                .setParameter("ids", projectIds)
                .getResultList();
    }

    /** Avis reçus par les demandes ouvertes de chaque projet : lignes [id du projet, nombre]. */
    List<Object[]> feedbackReceived(Collection<Long> projectIds) {
        return em.createQuery("""
                SELECT c.project.id, COUNT(f) FROM Feedback f JOIN f.call c
                WHERE c.project.id IN :ids AND c.open = true GROUP BY c.project.id
                """, Object[].class)
                .setParameter("ids", projectIds)
                .getResultList();
    }

    /** Candidatures en attente de ces projets, candidat et rôle visé chargés, les plus anciennes d'abord. */
    List<ProjectMember> pendingApplications(Collection<Long> projectIds) {
        return em.createQuery("""
                SELECT m FROM ProjectMember m JOIN FETCH m.user JOIN FETCH m.project p JOIN FETCH p.owner
                LEFT JOIN FETCH m.opening
                WHERE m.project.id IN :ids AND m.status = :pending
                ORDER BY m.createdAt ASC, m.id ASC
                """, ProjectMember.class)
                .setParameter("ids", projectIds)
                .setParameter("pending", MemberStatus.PENDING)
                .getResultList();
    }

    /**
     * Demandes de retours ouvertes hors de ses équipes, qu'il n'a ni écrites ni encore reçues de lui, les plus
     * récentes d'abord.
     */
    List<FeedbackCall> feedbackCallsFor(Long userId, Collection<Long> excludedProjectIds, int limit) {
        return em.createQuery("""
                SELECT c FROM FeedbackCall c JOIN FETCH c.author JOIN FETCH c.project p JOIN FETCH p.owner
                WHERE c.open = true AND c.author.id <> :userId AND p.id NOT IN :excluded
                  AND NOT EXISTS (SELECT f.id FROM Feedback f WHERE f.call = c AND f.author.id = :userId)
                ORDER BY c.createdAt DESC, c.id DESC
                """, FeedbackCall.class)
                .setParameter("userId", userId)
                // NOT IN () n'est pas du SQL valide : une liste vide devient un identifiant qui n'existe pas
                .setParameter("excluded", excludedProjectIds.isEmpty() ? List.of(-1L) : excludedProjectIds)
                .setMaxResults(limit)
                .getResultList();
    }

    // ==================== FIL D'ACTIVITÉ ====================

    List<DevlogEntry> devlogSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT d FROM DevlogEntry d JOIN FETCH d.author JOIN FETCH d.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND d.createdAt > :since ORDER BY d.createdAt DESC
                """, DevlogEntry.class)
                .setParameter("ids", projectIds)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    /**
     * Arrivées dans ces équipes (hors porteur). Une participation acceptée n'est plus modifiée ensuite que pour la
     * spécialité : sa dernière mise à jour date l'arrivée, sa création datant la candidature.
     */
    List<ProjectMember> joinsSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT m FROM ProjectMember m JOIN FETCH m.user JOIN FETCH m.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND m.status = :accepted AND m.role <> :owner AND m.updatedAt > :since
                ORDER BY m.updatedAt DESC
                """, ProjectMember.class)
                .setParameter("ids", projectIds)
                .setParameter("accepted", MemberStatus.ACCEPTED)
                .setParameter("owner", ProjectRole.OWNER)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    List<ProjectOpening> openingsSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT o FROM ProjectOpening o JOIN FETCH o.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND o.createdAt > :since ORDER BY o.createdAt DESC
                """, ProjectOpening.class)
                .setParameter("ids", projectIds)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    List<FeedbackCall> feedbackCallsSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT c FROM FeedbackCall c JOIN FETCH c.author JOIN FETCH c.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND c.createdAt > :since ORDER BY c.createdAt DESC
                """, FeedbackCall.class)
                .setParameter("ids", projectIds)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    List<Feedback> feedbackSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT f FROM Feedback f JOIN FETCH f.author JOIN FETCH f.call c JOIN FETCH c.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND f.createdAt > :since ORDER BY f.createdAt DESC
                """, Feedback.class)
                .setParameter("ids", projectIds)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    List<HackathonTeam> hackathonRegistrationsSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT t FROM HackathonTeam t JOIN FETCH t.hackathon JOIN FETCH t.registeredBy
                JOIN FETCH t.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND t.createdAt > :since ORDER BY t.createdAt DESC
                """, HackathonTeam.class)
                .setParameter("ids", projectIds)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    /** Pull requests ouvertes (hors brouillons) de ces projets. */
    List<PullRequest> pullRequestsOpenedSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT pr FROM PullRequest pr JOIN FETCH pr.author JOIN FETCH pr.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND pr.draft = false AND pr.createdAt > :since ORDER BY pr.createdAt DESC
                """, PullRequest.class)
                .setParameter("ids", projectIds)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    List<PullRequest> pullRequestsMergedSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT pr FROM PullRequest pr JOIN FETCH pr.author JOIN FETCH pr.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND pr.status = :merged AND pr.mergedAt > :since ORDER BY pr.mergedAt DESC
                """, PullRequest.class)
                .setParameter("ids", projectIds)
                .setParameter("merged", PullRequestStatus.MERGED)
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    /** Revues rendues avec un verdict (approuvée, changements demandés) sur les PR de ces projets. */
    List<PullRequestReviewer> verdictsSince(Collection<Long> projectIds, Instant since) {
        return em.createQuery("""
                SELECT r FROM PullRequestReviewer r JOIN FETCH r.reviewer JOIN FETCH r.pullRequest pr
                JOIN FETCH pr.project p JOIN FETCH p.owner
                WHERE p.id IN :ids AND r.state IN :verdicts AND r.submittedAt > :since ORDER BY r.submittedAt DESC
                """, PullRequestReviewer.class)
                .setParameter("ids", projectIds)
                .setParameter("verdicts", List.of(ReviewState.APPROVED, ReviewState.CHANGES_REQUESTED))
                .setParameter("since", since)
                .setMaxResults(PER_SOURCE)
                .getResultList();
    }

    /** Pull requests qui attendent sa revue, par projet : lignes [id du projet, nombre]. */
    List<Object[]> reviewRequestsByProject(Long userId) {
        return em.createQuery("""
                SELECT pr.project.id, COUNT(pr) FROM PullRequestReviewer r JOIN r.pullRequest pr
                WHERE r.reviewer.id = :userId AND pr.status = :open AND pr.draft = false
                  AND (r.state = :requested OR (r.state = :commented AND r.required = true))
                GROUP BY pr.project.id
                """, Object[].class)
                .setParameter("userId", userId)
                .setParameter("open", PullRequestStatus.OPEN)
                .setParameter("requested", ReviewState.REQUESTED)
                .setParameter("commented", ReviewState.COMMENTED)
                .getResultList();
    }

    // ==================== RÉPUTATION ====================

    /** Un total pour ce membre (COUNT ou SUM, paramètre :userId). */
    long count(String jpql, Long userId) {
        return ((Number) em.createQuery(jpql).setParameter("userId", userId).getSingleResult()).longValue();
    }
}
