package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;

/**
 * Les facettes en une requête groupée chacune. Le filtre de la recherche (ProjectOpeningSpecifications)
 * passe par des sous-requêtes pour les technologies : la jointure du regroupement reste la seule qui
 * multiplie les lignes, chaque annonce compte une fois.
 */
@RequiredArgsConstructor
public class OpeningFacetRepositoryImpl implements OpeningFacetRepository {

    // Technologies renvoyées au plus : les plus demandées ; la recherche par mot-clé trouve les autres
    private static final int MAX_TAGS = 100;

    private final EntityManager entityManager;

    @Override
    public List<Object[]> countByRole(Specification<ProjectOpening> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<ProjectOpening> opening = query.from(ProjectOpening.class);
        query.multiselect(opening.get("role"), cb.count(opening), cb.sumAsLong(opening.<Integer>get("seats")))
                .where(filter.toPredicate(opening, query, cb))
                .groupBy(opening.get("role"));
        return entityManager.createQuery(query).getResultList();
    }

    @Override
    public List<Object[]> countByTag(Specification<ProjectOpening> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<ProjectOpening> opening = query.from(ProjectOpening.class);
        Join<ProjectOpening, Project> project = opening.join("project");
        Join<Project, Tag> tag = project.join("tags");
        Expression<Long> openings = cb.countDistinct(opening);
        query.multiselect(tag.get("slug"), tag.get("name"), openings)
                .where(filter.toPredicate(opening, query, cb))
                .groupBy(tag.get("slug"), tag.get("name"))
                .orderBy(cb.desc(openings), cb.asc(tag.get("name")));
        return entityManager.createQuery(query).setMaxResults(MAX_TAGS).getResultList();
    }

    @Override
    public List<Object[]> countByOwnerCountry(Specification<ProjectOpening> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<ProjectOpening> opening = query.from(ProjectOpening.class);
        Join<ProjectOpening, Project> project = opening.join("project");
        Join<Project, Developer> owner = project.join("owner");
        Path<String> country = owner.get("country");
        query.multiselect(country, cb.count(opening))
                .where(cb.isNotNull(country), filter.toPredicate(opening, query, cb))
                .groupBy(country);
        return entityManager.createQuery(query).getResultList();
    }

    @Override
    public long sumSeats(Specification<ProjectOpening> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<ProjectOpening> opening = query.from(ProjectOpening.class);
        query.select(cb.coalesce(cb.sumAsLong(opening.<Integer>get("seats")), 0L))
                .where(filter.toPredicate(opening, query, cb));
        return entityManager.createQuery(query).getSingleResult();
    }

    @Override
    public long countProjects(Specification<ProjectOpening> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<ProjectOpening> opening = query.from(ProjectOpening.class);
        query.select(cb.countDistinct(opening.get("project")))
                .where(filter.toPredicate(opening, query, cb));
        return entityManager.createQuery(query).getSingleResult();
    }

    @Override
    public long countWithoutApplicants(Specification<ProjectOpening> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<ProjectOpening> opening = query.from(ProjectOpening.class);
        Subquery<Long> pending = query.subquery(Long.class);
        Root<ProjectMember> member = pending.from(ProjectMember.class);
        pending.select(member.get("id")).where(
                cb.equal(member.get("opening"), opening),
                cb.equal(member.get("status"), MemberStatus.PENDING));
        query.select(cb.count(opening))
                .where(filter.toPredicate(opening, query, cb), cb.not(cb.exists(pending)));
        return entityManager.createQuery(query).getSingleResult();
    }
}
