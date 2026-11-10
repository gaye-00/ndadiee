package com.hautetech.ndadiee.authentication.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.hautetech.ndadiee.authentication.verification.AccountCodeService;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer.Notice;
import com.hautetech.ndadiee.exception.AccountException;
import com.hautetech.ndadiee.exception.BusinessException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.project.Project;
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
import jakarta.persistence.Query;

/**
 * Supprimer son compte : la demande se confirme (mot de passe, ou code pour un compte sans mot de passe), ferme les
 * sessions et laisse 14 jours pour changer d'avis ; ensuite, tout ce qui disait qui était le membre disparaît.
 */
@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {

    @Mock
    private DeveloperRepository developers;
    @Mock
    private ProjectRepository projects;
    @Mock
    private ProjectMemberRepository projectMembers;
    @Mock
    private AccountCodeRepository accountCodeRepository;
    @Mock
    private EmailVerificationRepository emailVerifications;
    @Mock
    private ProjectService projectService;
    @Mock
    private AvatarService avatarService;
    @Mock
    private AccountCodeService accountCodes;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AccountNoticeComposer noticeComposer;
    @Mock
    private MailQueue mailQueue;
    @Mock
    private EntityManager entityManager;
    @Mock
    private Query query;

    @InjectMocks
    private AccountDeletionService service;

    private Developer awa;

    @BeforeEach
    void setUp() {
        awa = Developer.builder().username("awa").email("awa@example.com").fullName("Awa Diop").password("hash")
                .bio("Dev à Dakar").country("SN").city("Dakar").githubUrl("https://github.com/awa").reputation(420).build();
        awa.setId(7L);
        lenient().when(developers.findById(7L)).thenReturn(Optional.of(awa));
        lenient().when(noticeComposer.compose(any(), any(), any()))
                .thenReturn(new EmailMessage(7L, "awa@example.com", "objet", "texte", "<p>html</p>", "tag"));
    }

    private static String errorCodeOf(Throwable error) {
        return ((BusinessException) error).getErrorCode();
    }

    @Test
    void aWrongPasswordSchedulesNothing() {
        when(passwordEncoder.matches("pas-le-bon", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.request(7L, new AccountDeletionRequest("pas-le-bon", null)))
                .isInstanceOf(AccountException.class)
                .extracting(AccountDeletionServiceTest::errorCodeOf)
                .isEqualTo("PASSWORD_INCORRECT");
        assertThat(awa.getDeletionScheduledAt()).isNull();
        verify(developers, never()).save(any());
    }

    @Test
    void withoutPasswordNorCodeNothingIsConfirmed() {
        assertThatThrownBy(() -> service.request(7L, new AccountDeletionRequest(" ", null)))
                .extracting(AccountDeletionServiceTest::errorCodeOf)
                .isEqualTo("CONFIRMATION_REQUIRED");
        assertThat(awa.getDeletionScheduledAt()).isNull();
    }

    @Test
    void theRightPasswordSchedulesTheDeletionAndClosesEverySession() {
        when(passwordEncoder.matches("tisse-ton-kente", "hash")).thenReturn(true);
        Instant before = Instant.now();

        AccountDeletionResponse response = service.request(7L, new AccountDeletionRequest("tisse-ton-kente", null));

        assertThat(response.scheduledAt()).isEqualTo(awa.getDeletionScheduledAt());
        assertThat(Duration.between(before, response.scheduledAt())).isBetween(Duration.ofDays(14).minusMinutes(1), Duration.ofDays(14).plusMinutes(1));
        assertThat(awa.getCredentialsChangedAt()).isNotNull();
        verify(developers).save(awa);
        verify(noticeComposer).compose(awa, Notice.DELETION_SCHEDULED, response.scheduledAt());
        verify(mailQueue).submit(any());
    }

    @Test
    void anAccountWithoutPasswordConfirmsWithTheEmailedCode() {
        service.request(7L, new AccountDeletionRequest(null, "042917"));

        verify(accountCodes).consume(awa, Purpose.ACCOUNT_DELETION, "042917");
        assertThat(awa.getDeletionScheduledAt()).isNotNull();
    }

    @Test
    void anAdministrationAccountIsNotDeletedFromItsSettings() {
        when(developers.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.request(1L, new AccountDeletionRequest("secret", null)))
                .extracting(AccountDeletionServiceTest::errorCodeOf)
                .isEqualTo("ADMIN_ACCOUNT");
    }

    @Test
    void aDeletionCancelledByASignInLeavesTheAccountAlone() {
        awa.setDeletionScheduledAt(null);

        service.erase(7L);

        assertThat(awa.getUsername()).isEqualTo("awa");
        assertThat(awa.isDeleted()).isFalse();
        verify(projectService, never()).handOverOrDelete(any());
    }

    @Test
    void erasingRemovesEverythingThatSaidWhoTheMemberWas() {
        awa.setDeletionScheduledAt(Instant.now().minusSeconds(60));
        Project lagos = Project.builder().name("Lagos Transit").build();
        when(projects.findByOwnerIdOrderByCreatedAtAsc(7L)).thenReturn(List.of(lagos));
        when(projectMembers.findByUserId(7L)).thenReturn(List.of());
        when(entityManager.createQuery(anyString())).thenReturn(query);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(eq("id"), any())).thenReturn(query);
        when(passwordEncoder.encode(anyString())).thenReturn("random-hash");

        service.erase(7L);

        verify(projectService).handOverOrDelete(lagos);
        verify(avatarService).remove(7L);
        verify(accountCodeRepository).deleteByUserId(7L);
        verify(emailVerifications).deleteByUserId(7L);
        assertThat(awa.isDeleted()).isTrue();
        assertThat(awa.getDeletionScheduledAt()).isNull();
        assertThat(awa.getUsername()).isEqualTo("deleted-7").doesNotMatch("^[a-z0-9_]{3,30}$");
        assertThat(awa.getEmail()).isEqualTo("deleted-7@deleted.invalid");
        assertThat(awa.getFullName()).isEqualTo(AccountDeletionService.DELETED_NAME);
        assertThat(awa.getPassword()).isEqualTo("random-hash");
        assertThat(awa.isPasswordSet()).isFalse();
        assertThat(awa.getBio()).isNull();
        assertThat(awa.getCountry()).isNull();
        assertThat(awa.getCity()).isNull();
        assertThat(awa.getGithubUrl()).isNull();
        assertThat(awa.getReputation()).isZero();
        // L'avis d'adieu part à l'ancienne adresse, composée avant l'effacement
        verify(noticeComposer).compose(awa, Notice.ACCOUNT_DELETED, null);
        verify(mailQueue).submit(any());
    }
}
