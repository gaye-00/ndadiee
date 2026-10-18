package com.hautetech.ndadiee.service.admin;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.common.Pageables;
import com.hautetech.ndadiee.dto.request.AccountStatus;
import com.hautetech.ndadiee.dto.response.AdminUserResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.AdminMapper;
import com.hautetech.ndadiee.model.admin.AdminActionType;
import com.hautetech.ndadiee.model.admin.AdminTargetType;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.repository.specification.AdminSpecifications;
import com.hautetech.ndadiee.service.admin.AdminAuditService.Target;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les comptes, vus du back-office : les chercher, suspendre et réactiver, changer le rôle d'un membre. Chaque
 * décision va au journal (AdminAuditService).
 *
 * <ul>
 * <li>Un compte suspendu ne se connecte plus, sa session ne se renouvelle plus, et ses jetons encore valides
 * n'ouvrent plus rien (AuthenticationService, JwtAuthenticationFilter). Ce qu'il a publié reste en place :
 * le masquer est une autre décision.</li>
 * <li>Un compte d'administration ne se suspend pas, et ne change pas de rôle, depuis le back-office ; personne
 * ne s'y suspend soi-même.</li>
 * <li>Le rôle ADMIN ne s'attribue pas : un membre devient modérateur, un modérateur redevient membre.</li>
 * </ul>
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;
    private final AdminAuditService auditService;
    private final AdminMapper adminMapper;

    /** Les comptes des filtres, les plus récents d'abord par défaut, avec ce que chacun a publié. */
    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> list(String q, Role role, AccountStatus status, Pageable pageable) {
        Page<User> page = userRepository.findAll(AdminSpecifications.users(q, role, status), Pageables.inTotalOrder(pageable));
        return PageResponse.from(page, toResponses(page.getContent()));
    }

    public AdminUserResponse block(Long adminId, Long userId, String reason) {
        User user = userService.findUserOrThrow(userId);
        if (user.getId().equals(adminId)) {
            throw new OperationNotAllowedException("Vous ne pouvez pas suspendre votre propre compte");
        }
        if (user.getRole() == Role.ADMIN) {
            throw new OperationNotAllowedException("Un compte d'administration ne se suspend pas depuis le back-office");
        }
        if (user.isBlocked()) {
            throw new OperationNotAllowedException("Ce compte est déjà suspendu");
        }

        user.setBlockedAt(Instant.now());
        user.setBlockedReason(reason.trim());
        auditService.record(adminId, AdminActionType.BLOCK_USER, target(user), user.getBlockedReason(), null);
        return toResponse(userRepository.saveAndFlush(user));
    }

    public AdminUserResponse unblock(Long adminId, Long userId) {
        User user = userService.findUserOrThrow(userId);
        if (!user.isBlocked()) {
            throw new OperationNotAllowedException("Ce compte n'est pas suspendu");
        }

        user.setBlockedAt(null);
        user.setBlockedReason(null);
        auditService.record(adminId, AdminActionType.UNBLOCK_USER, target(user), null, null);
        return toResponse(userRepository.saveAndFlush(user));
    }

    /** Membre ou modérateur. Sans effet (et sans ligne au journal) si le membre a déjà ce rôle. */
    public AdminUserResponse changeRole(Long adminId, Long userId, Role role) {
        if (role == Role.ADMIN) {
            throw new OperationNotAllowedException("Le rôle d'administration ne s'attribue pas depuis le back-office", "role");
        }
        User user = (User) Hibernate.unproxy(userService.findUserOrThrow(userId));
        if (!(user instanceof Developer)) {
            throw new OperationNotAllowedException("Seul un membre de la communauté change de rôle");
        }

        Role previous = user.getRole();
        if (previous == role) {
            return toResponse(user);
        }
        user.setRole(role);
        auditService.record(adminId, AdminActionType.CHANGE_ROLE, target(user), null, previous + " → " + role);
        return toResponse(userRepository.saveAndFlush(user));
    }

    // ==================== HELPERS ====================

    private Target target(User user) {
        return new Target(AdminTargetType.USER, user.getId(), user.getUsername());
    }

    private AdminUserResponse toResponse(User user) {
        return toResponses(List.of(user)).getFirst();
    }

    // Ce que chacun a publié : trois requêtes groupées pour toute la page
    private List<AdminUserResponse> toResponses(List<User> users) {
        if (users.isEmpty()) {
            return List.of();
        }
        List<Long> ids = users.stream().map(User::getId).toList();
        Map<Long, Long> questions = byId(questionRepository.countByAuthors(ids));
        Map<Long, Long> answers = byId(answerRepository.countByAuthors(ids));
        Map<Long, Long> projects = byId(projectRepository.countByOwners(ids));
        return users.stream()
                .map(user -> {
                    AdminUserResponse response = adminMapper.toUserResponse(user);
                    response.setQuestionCount(questions.getOrDefault(user.getId(), 0L));
                    response.setAnswerCount(answers.getOrDefault(user.getId(), 0L));
                    response.setProjectCount(projects.getOrDefault(user.getId(), 0L));
                    return response;
                })
                .toList();
    }

    // Lignes [identifiant, nombre] → table identifiant → nombre
    private static Map<Long, Long> byId(Collection<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
                row -> ((Number) row[0]).longValue(), row -> ((Number) row[1]).longValue()));
    }
}
