package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectOpening;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

/**
 * Les facettes en une requête groupée chacune. Le filtre de la recherche (ProjectSpecifications) s'applique
 * au projet par des sous-requêtes : la jointure du regroupement reste la seule, chaque projet compte une fois.
 */
@RequiredArgsConstructor
public class ProjectFacetRepositoryImpl implements ProjectFacetRepository {

    // Technologies renvoyées au plus : les plus présentes ; la recherche par mot-clé trouve les autres
    private static final int MAX_TAGS = 100;

    private final EntityManager entityManager;

    @Override
    public List<Object[]> countByOpenRole(Specification<Project> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<Project> project = query.from(Project.class);
        Join<Project, ProjectOpening> opening = project.join("openings");
        query.multiselect(opening.get("role"), cb.countDistinct(project), cb.sumAsLong(opening.<Integer>get("seats")))
                .where(cb.isTrue(opening.get("open")), filter.toPredicate(project, query, cb))
                .groupBy(opening.get("role"));
        return entityManager.createQuery(query).getResultList();
    }

    @Override
    public List<Object[]> countByTag(Specification<Project> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<Project> project = query.from(Project.class);
        Join<Project, Tag> tag = project.join("tags");
        Expression<Long> projects = cb.countDistinct(project);
        query.multiselect(tag.get("slug"), tag.get("name"), projects)
                .where(filter.toPredicate(project, query, cb))
                .groupBy(tag.get("slug"), tag.get("name"))
                .orderBy(cb.desc(projects), cb.asc(tag.get("name")));
        return entityManager.createQuery(query).setMaxResults(MAX_TAGS).getResultList();
    }

    @Override
    public List<Object[]> countByOwnerCountry(Specification<Project> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<Project> project = query.from(Project.class);
        Join<Project, Developer> owner = project.join("owner");
        Path<String> country = owner.get("country");
        query.multiselect(country, cb.countDistinct(project))
                .where(cb.isNotNull(country), filter.toPredicate(project, query, cb))
                .groupBy(country);
        return entityManager.createQuery(query).getResultList();
    }

    @Override
    public long sumOpenSeats(Specification<Project> filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<Project> project = query.from(Project.class);
        Join<Project, ProjectOpening> opening = project.join("openings");
        query.select(cb.coalesce(cb.sumAsLong(opening.<Integer>get("seats")), 0L))
                .where(cb.isTrue(opening.get("open")), filter.toPredicate(project, query, cb));
        return entityManager.createQuery(query).getSingleResult();
    }
}
