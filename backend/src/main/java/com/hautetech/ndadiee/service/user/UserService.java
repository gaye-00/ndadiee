package com.hautetech.ndadiee.service.user;

import java.time.Instant;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.authentication.UserResponse;
import com.hautetech.ndadiee.dto.request.EmailPreferencesRequest;
import com.hautetech.ndadiee.dto.request.UpdateProfileRequest;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.UserProfileResponse;
import com.hautetech.ndadiee.dto.response.UserSummaryResponse;
import com.hautetech.ndadiee.event.UserFollowedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.BadgeMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.ArticleRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.HackathonTeamRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.UserBadgeRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.repository.specification.DeveloperSpecifications;
import com.hautetech.ndadiee.service.content.TagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final DeveloperRepository developerRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ArticleRepository articleRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final HackathonTeamRepository hackathonTeamRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final TagService tagService;
    private final UserMapper userMapper;
    private final BadgeMapper badgeMapper;
    private final ApplicationEventPublisher eventPublisher;

    // ==================== PROFILS ====================

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryResponse> search(String q, String country, String skill,
            ExperienceLevel level, Boolean openToWork, Pageable pageable) {
        Page<Developer> page = developerRepository.findAll(
                DeveloperSpecifications.filter(q, country, skill, level, openToWork), pageable);
        return PageResponse.from(page.map(userMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String username, Long currentUserId) {
        Developer developer = findDeveloperByUsernameOrThrow(username);
        Long id = developer.getId();

        UserProfileResponse response = userMapper.toProfile(developer);
        response.setBadges(badgeMapper.toUserBadgeResponses(userBadgeRepository.findByUserIdOrderByAwardedAtDesc(id)));
        response.setFollowersCount(developerRepository.countFollowers(id));
        response.setFollowingCount(developerRepository.countFollowing(id));
        // Ce que le public peut voir : les contenus masqués par l'administration ne comptent pas
        response.setQuestionCount(questionRepository.countByAuthorIdAndHiddenAtIsNull(id));
        response.setAnswerCount(answerRepository.countByAuthorIdAndHiddenAtIsNull(id));
        response.setArticleCount(articleRepository.countByAuthorIdAndStatus(id, ArticleStatus.PUBLISHED));
        response.setProjectCount(projectRepository.countByOwnerIdAndHiddenAtIsNull(id));
        response.setTeamCount(projectMemberRepository.countByUserIdAndStatusAndRoleNotAndProjectHiddenAtIsNull(
                id, MemberStatus.ACCEPTED, ProjectRole.OWNER));
        response.setAcceptedAnswerCount(answerRepository.countByAuthorIdAndAcceptedTrueAndHiddenAtIsNull(id));
        response.setHackathonCount(hackathonTeamRepository.countStartedForMember(id, MemberStatus.ACCEPTED, Instant.now()));
        response.setPodiumCount(hackathonTeamRepository.countPodiumsForMember(id, MemberStatus.ACCEPTED));
        if (currentUserId != null && !currentUserId.equals(id)) {
            response.setFollowedByMe(developerRepository.isFollowing(currentUserId, id));
        }
        return response;
    }

    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        Developer developer = getDeveloperOrThrow(userId);

        developer.setFullName(request.getFullName().trim());
        developer.setBio(request.getBio());
        developer.setCountry(request.getCountry() == null ? null : request.getCountry().toUpperCase());
        developer.setCity(request.getCity());
        developer.setPreferredLanguage(request.getPreferredLanguage() == null ? Language.FR : request.getPreferredLanguage());
        developer.setGithubUrl(request.getGithubUrl());
        developer.setLinkedinUrl(request.getLinkedinUrl());
        developer.setWebsiteUrl(request.getWebsiteUrl());
        developer.setLevel(request.getLevel());
        developer.setOpenToWork(Boolean.TRUE.equals(request.getOpenToWork()));

        developer.getSkills().clear();
        developer.getSkills().addAll(tagService.resolveTags(request.getSkills()));

        log.info("[User] Profil mis à jour - ID: {}", userId);
        return userMapper.toUserResponse(developer);
    }

    /** Les e-mails qu'il veut recevoir : ceux des revues de code, pour l'instant. */
    public UserResponse updateEmailPreferences(Long userId, EmailPreferencesRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        user.setReviewEmails(request.getReviewEmails());
        log.info("[User] E-mails de revue {} - ID: {}", user.isReviewEmails() ? "activés" : "coupés", userId);
        return userMapper.toUserResponse(user);
    }

    // ==================== ABONNEMENTS ====================

    public void follow(Long followerId, String username) {
        Developer follower = getDeveloperOrThrow(followerId);
        Developer followed = findDeveloperByUsernameOrThrow(username);

        if (follower.getId().equals(followed.getId())) {
            throw new OperationNotAllowedException("Vous ne pouvez pas vous suivre vous-même");
        }
        // add() renvoie false si l'abonnement existait déjà : on ne notifie qu'une fois
        if (follower.getFollowing().add(followed)) {
            log.info("[User] {} suit {}", follower.getUsername(), followed.getUsername());
            eventPublisher.publishEvent(new UserFollowedEvent(follower.getId(), followed.getId()));
        }
    }

    public void unfollow(Long followerId, String username) {
        Developer follower = getDeveloperOrThrow(followerId);
        Developer followed = findDeveloperByUsernameOrThrow(username);
        follower.getFollowing().remove(followed);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryResponse> getFollowers(String username, Pageable pageable) {
        Developer developer = findDeveloperByUsernameOrThrow(username);
        return PageResponse.from(developerRepository.findFollowers(developer.getId(), unsorted(pageable))
                .map(userMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryResponse> getFollowing(String username, Pageable pageable) {
        Developer developer = findDeveloperByUsernameOrThrow(username);
        return PageResponse.from(developerRepository.findFollowing(developer.getId(), unsorted(pageable))
                .map(userMapper::toSummary));
    }

    public void followTag(Long userId, String tagSlug) {
        Developer developer = getDeveloperOrThrow(userId);
        Tag tag = tagService.findBySlugOrThrow(tagSlug);
        developer.getFollowedTags().add(tag);
    }

    public void unfollowTag(Long userId, String tagSlug) {
        Developer developer = getDeveloperOrThrow(userId);
        Tag tag = tagService.findBySlugOrThrow(tagSlug);
        developer.getFollowedTags().remove(tag);
    }

    // ==================== HELPERS ====================

    public User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
    }

    /**
     * Le membre de la communauté derrière cet identifiant. Un compte Admin n'en est pas un :
     * il ne publie pas, ne vote pas, n'a pas de réputation.
     */
    public Developer getDeveloperOrThrow(Long userId) {
        return developerRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException("Cette action est réservée aux membres de la communauté"));
    }

    public Developer findDeveloperByUsernameOrThrow(String username) {
        return developerRepository.findByUsername(username.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur", "nom d'utilisateur", username));
    }

    /** Vrai pour un modérateur ou un admin : peut modifier ou supprimer le contenu des autres. */
    public boolean canModerate(Long userId) {
        return findUserOrThrow(userId).getRole().canModerate();
    }

    /** Vrai pour un compte d'administration ; faux pour un visiteur (null). */
    public boolean isAdmin(Long userId) {
        return userId != null && userRepository.findById(userId)
                .map(user -> user.getRole() == Role.ADMIN)
                .orElse(false);
    }

    /**
     * Un contenu masqué par l'administration reste visible de son auteur (qui y lit le motif) et des admins ;
     * pour tous les autres, il n'existe plus.
     */
    public boolean canSeeHidden(Long viewerId, Long authorId) {
        return viewerId != null && (viewerId.equals(authorId) || isAdmin(viewerId));
    }

    // Les requêtes d'abonnés ont leur propre ORDER BY : on ne garde que la pagination demandée
    private Pageable unsorted(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
    }
}
