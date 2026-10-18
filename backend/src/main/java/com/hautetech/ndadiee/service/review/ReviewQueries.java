package com.hautetech.ndadiee.service.review;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Repository;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.ReviewState;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;

/**
 * Les lectures de la page des revues : les PR de chaque onglet (ReviewTab) pour le membre connecté, avec la
 * recherche et le filtre de projet, et leurs totaux. Chaque onglet est une condition sur la PR, son projet, ses
 * relecteurs et l'équipe du membre.
 */
@Repository
class ReviewQueries {

    // Au-delà, l'onglet Communauté (classé en mémoire) s'arrête : les plus récentes suffisent
    static final int COMMUNITY_CANDIDATES = 200;

    @PersistenceContext
    private EntityManager em;

    /** Les filtres d'une liste : l'onglet, un mot-clé (titre, numéro, projet), un projet par son slug. */
    record Filter(Long viewerId, ReviewTab tab, String q, String project) {
    }

    // Le membre est dans l'équipe acceptée du projet
    private static final String IN_TEAM = """
            EXISTS (SELECT m.id FROM ProjectMember m WHERE m.project = p AND m.user.id = :me AND m.status = :accepted)""";
    // Le membre est relecteur de la PR
    private static final String REVIEWER = """
            EXISTS (SELECT r.id FROM PullRequestReviewer r WHERE r.pullRequest = pr AND r.reviewer.id = :me)""";

    private static String condition(ReviewTab tab) {
        return switch (tab) {
            case TO_REVIEW -> """
                    pr.status = :open AND pr.draft = false AND EXISTS (
                        SELECT r.id FROM PullRequestReviewer r WHERE r.pullRequest = pr AND r.reviewer.id = :me
                          AND (r.state = :requested OR (r.state = :commented AND r.required = true)))""";
            case COMMUNITY -> "pr.status = :open AND pr.draft = false AND pr.community = true AND pr.author.id <> :me AND NOT "
                    + IN_TEAM + " AND NOT " + REVIEWER;
            case MINE -> "pr.author.id = :me";
            case TEAM -> "pr.status = :open AND " + IN_TEAM;
            case DONE -> "pr.status <> :open AND (pr.author.id = :me OR " + IN_TEAM + " OR " + REVIEWER + ")";
        };
    }

    private static String order(ReviewTab tab) {
        return switch (tab) {
            // Les plus anciennes d'abord : c'est l'attente qui compte
            case TO_REVIEW -> "pr.createdAt ASC, pr.id ASC";
            case MINE -> "CASE WHEN pr.status = :open THEN 0 ELSE 1 END, pr.lastActivityAt DESC, pr.id DESC";
            case DONE -> "COALESCE(pr.mergedAt, pr.closedAt) DESC, pr.id DESC";
            // L'onglet Communauté est classé en mémoire (ReviewService) : les plus récentes d'abord en base
            case TEAM, COMMUNITY -> "pr.lastActivityAt DESC, pr.id DESC";
        };
    }

    private static String where(Filter filter, Map<String, Object> params) {
        StringBuilder where = new StringBuilder(" WHERE ").append(condition(filter.tab()));
        params.put("me", filter.viewerId());
        params.put("open", PullRequestStatus.OPEN);
        params.put("accepted", MemberStatus.ACCEPTED);
        params.put("requested", ReviewState.REQUESTED);
        params.put("commented", ReviewState.COMMENTED);
        if (filter.q() != null && !filter.q().isBlank()) {
            String q = filter.q().trim();
            // « #84 » ou « 84 » : le numéro de la PR
            String number = q.startsWith("#") ? q.substring(1) : q;
            where.append(" AND (LOWER(pr.title) LIKE :q OR LOWER(p.name) LIKE :q OR LOWER(pr.sourceBranch) LIKE :q");
            if (number.matches("\\d{1,9}")) {
                where.append(" OR pr.number = :number");
                params.put("number", Integer.parseInt(number));
            }
            where.append(")");
            params.put("q", "%" + q.toLowerCase(Locale.ROOT) + "%");
        }
        if (filter.project() != null && !filter.project().isBlank()) {
            where.append(" AND p.slug = :project");
            params.put("project", filter.project());
        }
        return where.toString();
    }

    /** Une page de l'onglet, projet, porteur et auteur chargés. */
    List<PullRequest> page(Filter filter, int offset, int limit) {
        Map<String, Object> params = new HashMap<>();
        String jpql = "SELECT pr FROM PullRequest pr JOIN FETCH pr.project p JOIN FETCH p.owner JOIN FETCH pr.author"
                + where(filter, params) + " ORDER BY " + order(filter.tab());
        TypedQuery<PullRequest> query = em.createQuery(jpql, PullRequest.class);
        bind(query, jpql, params);
        return query.setFirstResult(offset).setMaxResults(limit).getResultList();
    }

    long count(Filter filter) {
        Map<String, Object> params = new HashMap<>();
        String jpql = "SELECT COUNT(pr) FROM PullRequest pr JOIN pr.project p" + where(filter, params);
        TypedQuery<Long> query = em.createQuery(jpql, Long.class);
        bind(query, jpql, params);
        return query.getSingleResult();
    }

    // Seuls les paramètres que la requête cite : JPA refuse les autres
    private static void bind(Query query, String jpql, Map<String, Object> params) {
        params.forEach((name, value) -> {
            if (jpql.matches("(?s).*:" + name + "\\b.*")) {
                query.setParameter(name, value);
            }
        });
    }

    // ==================== VUE D'ENSEMBLE ====================

    /** PR ouvertes de ses équipes, par projet : lignes [id du projet, nombre], les plus nombreuses d'abord. */
    List<Object[]> openByTeamProject(Long viewerId) {
        return em.createQuery("""
                SELECT p.id, COUNT(pr) FROM PullRequest pr JOIN pr.project p
                WHERE pr.status = :open AND EXISTS (
                    SELECT m.id FROM ProjectMember m WHERE m.project = p AND m.user.id = :me AND m.status = :accepted)
                GROUP BY p.id ORDER BY COUNT(pr) DESC, p.id ASC
                """, Object[].class)
                .setParameter("open", PullRequestStatus.OPEN)
                .setParameter("me", viewerId)
                .setParameter("accepted", MemberStatus.ACCEPTED)
                .getResultList();
    }

    /** La plus ancienne demande de revue qui l'attend encore, sur une PR ouverte. */
    Instant oldestRequest(Long viewerId) {
        return em.createQuery("""
                SELECT MIN(r.createdAt) FROM PullRequestReviewer r
                WHERE r.reviewer.id = :me AND r.state = :requested AND r.pullRequest.status = :open
                  AND r.pullRequest.draft = false
                """, Instant.class)
                .setParameter("me", viewerId)
                .setParameter("requested", ReviewState.REQUESTED)
                .setParameter("open", PullRequestStatus.OPEN)
                .getSingleResult();
    }

    /** Ses revues rendues : lignes [état, communautaire, nombre]. */
    List<Object[]> reviewsGivenBy(Long viewerId) {
        return em.createQuery("""
                SELECT r.state, r.community, COUNT(r) FROM PullRequestReviewer r
                WHERE r.reviewer.id = :me AND r.state <> :requested
                GROUP BY r.state, r.community
                """, Object[].class)
                .setParameter("me", viewerId)
                .setParameter("requested", ReviewState.REQUESTED)
                .getResultList();
    }

    long mergedBy(Long viewerId) {
        return em.createQuery("SELECT COUNT(pr) FROM PullRequest pr WHERE pr.author.id = :me AND pr.status = :merged", Long.class)
                .setParameter("me", viewerId)
                .setParameter("merged", PullRequestStatus.MERGED)
                .getSingleResult();
    }

    /** Ses équipes acceptées : les identifiants des projets. */
    List<Long> teamProjectIds(Long viewerId) {
        return em.createQuery("""
                SELECT m.project.id FROM ProjectMember m WHERE m.user.id = :me AND m.status = :accepted
                """, Long.class)
                .setParameter("me", viewerId)
                .setParameter("accepted", MemberStatus.ACCEPTED)
                .getResultList();
    }

    /** Parmi ces PR, celles qui sont la première de leur auteur dans leur projet, quand il n'en est pas le porteur. */
    List<PullRequest> firstPullRequests(List<Long> pullRequestIds) {
        return em.createQuery("""
                SELECT pr FROM PullRequest pr WHERE pr.id IN :ids AND pr.author <> pr.project.owner AND NOT EXISTS (
                    SELECT o.id FROM PullRequest o
                    WHERE o.project = pr.project AND o.author = pr.author AND o.createdAt < pr.createdAt)
                """, PullRequest.class)
                .setParameter("ids", pullRequestIds)
                .getResultList();
    }

    /** Les participations de ces membres à ces projets, projet et membre chargés. */
    List<ProjectMember> memberships(Collection<Long> projectIds, Collection<Long> userIds) {
        return em.createQuery("""
                SELECT m FROM ProjectMember m JOIN FETCH m.project JOIN FETCH m.user
                WHERE m.project.id IN :projects AND m.user.id IN :users
                """, ProjectMember.class)
                .setParameter("projects", projectIds)
                .setParameter("users", userIds)
                .getResultList();
    }

    /** Le prochain numéro libre d'un projet (après le plus grand déjà pris). */
    int nextNumber(Long projectId) {
        Integer max = em.createQuery("SELECT MAX(pr.number) FROM PullRequest pr WHERE pr.project.id = :id", Integer.class)
                .setParameter("id", projectId)
                .getSingleResult();
        return max == null ? 1 : max + 1;
    }
}
