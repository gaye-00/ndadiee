package com.hautetech.ndadiee.authentication.account;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.hautetech.ndadiee.authentication.PendingVerificationResponse;
import com.hautetech.ndadiee.authentication.verification.AccountCodeService;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer.Notice;
import com.hautetech.ndadiee.authentication.verification.OneTimeCodes;
import com.hautetech.ndadiee.event.ProjectMemberLeftEvent;
import com.hautetech.ndadiee.exception.AccountException;
import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.user.AccountCode.Purpose;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AccountCodeRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.EmailVerificationRepository;
import com.hautetech.ndadiee.repository.ProjectMemberRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.media.AvatarService;
import com.hautetech.ndadiee.service.project.ProjectService;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Supprimer son compte. La demande, confirmée par le mot de passe (ou par un code reçu par e-mail pour un compte
 * GitHub ou Google sans mot de passe), ferme aussitôt toutes les sessions ; le compte est effacé 14 jours plus tard.
 * D'ici là, se reconnecter annule tout (AuthenticationService.openSession).
 *
 * <p>L'effacement retire tout ce qui dit qui était le membre : nom, adresse, photo, profil, comptes GitHub et Google
 * reliés, abonnements, favoris, notifications, participations aux équipes. Ses contributions publiques (sujets,
 * réponses, articles, revues, messages) restent, signées « Compte supprimé » : les discussions des autres gardent leur
 * sens. Ses projets avec une équipe passent à un membre de l'équipe ; les autres partent avec le compte.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AccountDeletionService {

    public static final Duration GRACE_PERIOD = Duration.ofDays(14);
    /** Le nom affiché à la place de celui d'un compte supprimé */
    public static final String DELETED_NAME = "Compte supprimé";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final DeveloperRepository developers;
    private final ProjectRepository projects;
    private final ProjectMemberRepository projectMembers;
    private final AccountCodeRepository accountCodeRepository;
    private final EmailVerificationRepository emailVerifications;
    private final ProjectService projectService;
    private final AvatarService avatarService;
    private final AccountCodeService accountCodes;
    private final PasswordEncoder passwordEncoder;
    private final AccountNoticeComposer noticeComposer;
    private final EmailSender emailSender;
    private final MailQueue mailQueue;
    private final UserMapper userMapper;
    private final EntityManager entityManager;
    private final TransactionTemplate transaction;
    private final ApplicationEventPublisher eventPublisher;

    /** Ce que la suppression ferait : le délai, la preuve demandée, et le sort de chaque projet porté. */
    @Transactional(readOnly = true)
    public AccountDeletionPreview preview(Long userId) {
        Developer developer = developerOrThrow(userId);
        List<AccountDeletionPreview.OwnedProject> owned = projects.findByOwnerIdOrderByCreatedAtAsc(userId).stream()
                .map(project -> new AccountDeletionPreview.OwnedProject(project.getId(), project.getName(), project.getSlug(),
                        projectService.successorOf(project).map(member -> userMapper.toSummary(member.getUser())).orElse(null)))
                .toList();
        return new AccountDeletionPreview(GRACE_PERIOD.toDays(), developer.isPasswordSet(), developer.getEmail(), owned);
    }

    /** Un code pour confirmer la suppression d'un compte sans mot de passe, envoyé à son adresse. */
    public PendingVerificationResponse sendCode(Long userId) {
        Developer developer = developerOrThrow(userId);
        return new PendingVerificationResponse(developer.getEmail(), accountCodes.send(developer, Purpose.ACCOUNT_DELETION));
    }

    /**
     * Programme la suppression du compte, une fois le mot de passe (ou le code) vérifié : toutes les sessions se
     * ferment, un e-mail annonce la date et dit comment annuler.
     */
    @Transactional(noRollbackFor = EmailVerificationException.class)
    public AccountDeletionResponse request(Long userId, AccountDeletionRequest request) {
        Developer developer = developerOrThrow(userId);
        if (hasText(request.getPassword())) {
            if (!passwordEncoder.matches(request.getPassword(), developer.getPassword())) {
                throw AccountException.wrongPassword("password");
            }
        } else if (hasText(request.getCode())) {
            accountCodes.consume(developer, Purpose.ACCOUNT_DELETION, request.getCode());
        } else {
            throw AccountException.confirmationRequired();
        }

        Instant now = Instant.now();
        Instant scheduledAt = now.plus(GRACE_PERIOD);
        developer.setDeletionScheduledAt(scheduledAt);
        developer.setCredentialsChangedAt(now.truncatedTo(ChronoUnit.SECONDS));
        developers.save(developer);

        EmailMessage notice = noticeComposer.compose(developer, Notice.DELETION_SCHEDULED, scheduledAt);
        OneTimeCodes.afterCommit(() -> mailQueue.submit(() -> emailSender.send(notice)));
        log.info("[Account] Suppression programmée au {} - ID: {}", scheduledAt, userId);
        return new AccountDeletionResponse(scheduledAt);
    }

    /**
     * Le ménage : les comptes dont le délai est passé sont effacés, chacun dans sa transaction (un échec n'empêche pas
     * les autres, et sera retenté au passage suivant).
     */
    @Scheduled(initialDelayString = "PT10M", fixedDelayString = "PT1H")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void eraseDueAccounts() {
        List<Long> due = developers.findIdsOfDeletionDueBefore(Instant.now());
        for (Long id : due) {
            try {
                transaction.executeWithoutResult(status -> erase(id));
            } catch (RuntimeException e) {
                log.error("[Account] Effacement du compte {} impossible, nouvel essai au prochain passage", id, e);
            }
        }
    }

    /**
     * Efface un compte dont la suppression est due : relu ici, il n'est effacé que si sa suppression est toujours
     * programmée et passée (une connexion de dernière minute l'a peut-être annulée).
     */
    void erase(Long userId) {
        Developer developer = developers.findById(userId).orElse(null);
        if (developer == null || developer.isDeleted() || developer.getDeletionScheduledAt() == null
                || developer.getDeletionScheduledAt().isAfter(Instant.now())) {
            return;
        }
        // L'avis part à l'adresse d'avant l'effacement
        EmailMessage farewell = noticeComposer.compose(developer, Notice.ACCOUNT_DELETED, null);

        // Ses projets : transmis à l'équipe, ou supprimés avec lui
        for (Project project : projects.findByOwnerIdOrderByCreatedAtAsc(userId)) {
            projectService.handOverOrDelete(project);
        }
        // Ses places dans les autres équipes, et ses candidatures : ses tâches attendent un nouveau preneur
        for (ProjectMember member : projectMembers.findByUserId(userId)) {
            if (member.getRole() == ProjectRole.OWNER) {
                continue;
            }
            boolean wasInTeam = member.getStatus() == MemberStatus.ACCEPTED;
            Long projectId = member.getProject().getId();
            projectMembers.delete(member);
            if (wasInTeam) {
                eventPublisher.publishEvent(new ProjectMemberLeftEvent(projectId, userId));
            }
        }

        // Ce qui le relie encore à quelqu'un ou à quelque chose
        entityManager.createQuery("delete from UserIdentity i where i.user.id = :id").setParameter("id", userId).executeUpdate();
        entityManager.createQuery("delete from Notification n where n.recipient.id = :id").setParameter("id", userId).executeUpdate();
        entityManager.createQuery("delete from Bookmark b where b.user.id = :id").setParameter("id", userId).executeUpdate();
        entityManager.createNativeQuery("delete from user_follows where follower_id = :id or following_id = :id")
                .setParameter("id", userId).executeUpdate();
        accountCodeRepository.deleteByUserId(userId);
        emailVerifications.deleteByUserId(userId);
        avatarService.remove(userId);

        // Ce qui disait qui il était
        developer.getSkills().clear();
        developer.getFollowedTags().clear();
        developer.getFollowing().clear();
        developer.setUsername("deleted-" + userId);
        developer.setEmail("deleted-" + userId + "@deleted.invalid");
        developer.setPassword(passwordEncoder.encode(randomSecret()));
        developer.setPasswordSet(false);
        developer.setFullName(DELETED_NAME);
        developer.setAvatarUrl(null);
        developer.setBio(null);
        developer.setCountry(null);
        developer.setCity(null);
        developer.setGithubUrl(null);
        developer.setLinkedinUrl(null);
        developer.setWebsiteUrl(null);
        developer.setLevel(null);
        developer.setOpenToWork(false);
        developer.setReputation(0);
        developer.setReviewEmails(false);
        developer.setLastLoginAt(null);
        developer.setBlockedAt(null);
        developer.setBlockedReason(null);
        developer.setDeletionScheduledAt(null);
        Instant now = Instant.now();
        developer.setDeletedAt(now);
        developer.setCredentialsChangedAt(now.truncatedTo(ChronoUnit.SECONDS));
        developers.save(developer);

        OneTimeCodes.afterCommit(() -> mailQueue.submit(() -> emailSender.send(farewell)));
        log.info("[Account] Compte effacé - ID: {}", userId);
    }

    // ==================== HELPERS ====================

    private Developer developerOrThrow(Long userId) {
        return developers.findById(userId)
                .filter(developer -> !developer.isDeleted())
                .orElseThrow(AccountException::adminAccount);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
