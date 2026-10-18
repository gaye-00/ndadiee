package com.hautetech.ndadiee.repository.specification;

import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.contains;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.hasText;
import static com.hautetech.ndadiee.repository.specification.SpecificationUtils.terms;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import org.springframework.data.jpa.domain.Specification;

import com.hautetech.ndadiee.dto.request.AccountStatus;
import com.hautetech.ndadiee.dto.request.Visibility;
import com.hautetech.ndadiee.model.content.Answer;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

/**
 * Les listes du back-office. Contrairement aux filtres publics, elles montrent aussi ce qui est masqué ou
 * suspendu : c'est même ce qu'on y cherche. Chaque mot de la recherche doit se trouver quelque part.
 */
public final class AdminSpecifications {

    private AdminSpecifications() {
    }

    /** Les comptes : nom d'utilisateur, nom complet ou e-mail ; rôle ; actifs ou suspendus. */
    public static Specification<User> users(String q, Role role, AccountStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(q)) {
                terms(q).forEach(term -> predicates.add(cb.or(
                        contains(cb, root.get("username"), term),
                        contains(cb, root.get("fullName"), term),
                        contains(cb, root.get("email"), term))));
            }
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (status != null) {
                predicates.add(status == AccountStatus.BLOCKED
                        ? cb.isNotNull(root.get("blockedAt"))
                        : cb.isNull(root.get("blockedAt")));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Les sujets du forum : titre, contenu ou auteur. */
    public static Specification<Question> questions(String q, Visibility visibility) {
        return content(q, visibility, root -> List.of(root.<String>get("title"), root.<String>get("body"),
                root.get("author").<String>get("username")));
    }

    /** Les réponses : leur texte, le titre de leur sujet ou leur auteur. */
    public static Specification<Answer> answers(String q, Visibility visibility) {
        return content(q, visibility, root -> List.of(root.<String>get("body"), root.get("question").<String>get("title"),
                root.get("author").<String>get("username")));
    }

    /** Les projets : nom, accroche ou porteur. */
    public static Specification<Project> projects(String q, Visibility visibility) {
        return content(q, visibility, root -> List.of(root.<String>get("name"), root.<String>get("tagline"),
                root.get("owner").<String>get("username")));
    }

    // Un contenu masquable : chaque mot de la recherche dans l'un des champs cherchés, et l'état demandé
    private static <T> Specification<T> content(String q, Visibility visibility,
            Function<Root<T>, List<Expression<String>>> searchedFields) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (hasText(q)) {
                List<Expression<String>> fields = searchedFields.apply(root);
                terms(q).forEach(term -> predicates.add(cb.or(fields.stream()
                        .map(field -> contains(cb, field, term))
                        .toArray(Predicate[]::new))));
            }
            if (visibility != null) {
                predicates.add(visibility == Visibility.HIDDEN
                        ? cb.isNotNull(root.get("hiddenAt"))
                        : cb.isNull(root.get("hiddenAt")));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
