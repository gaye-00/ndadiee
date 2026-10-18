package com.hautetech.ndadiee.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.AdminMapper;
import com.hautetech.ndadiee.mapper.AdminMapperImpl;
import com.hautetech.ndadiee.model.admin.AdminActionType;
import com.hautetech.ndadiee.model.admin.AdminTargetType;
import com.hautetech.ndadiee.model.user.Admin;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.admin.AdminAuditService.Target;
import com.hautetech.ndadiee.service.user.UserService;

/** Suspendre, réactiver, changer de rôle : ce que l'administration peut faire d'un compte, et ce qu'elle ne peut pas. */
@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    private static final Long ADMIN = 1L;
    private static final Long MEMBER = 2L;
    private static final Long OTHER_ADMIN = 3L;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AnswerRepository answerRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserService userService;

    @Mock
    private AdminAuditService auditService;

    @Spy
    private AdminMapper adminMapper = new AdminMapperImpl();

    @InjectMocks
    private AdminUserService adminUserService;

    private static Developer member(Role role) {
        Developer developer = Developer.builder().username("samuel_ngono").fullName("Samuel Ngono").role(role).reputation(12).build();
        developer.setId(MEMBER);
        return developer;
    }

    private static Admin admin(Long id) {
        Admin admin = Admin.builder().username("admin" + id).fullName("Équipe").role(Role.ADMIN).build();
        admin.setId(id);
        return admin;
    }

    // Le compte est enregistré tel quel
    private void savesAsIs() {
        when(userRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void blockingAMemberSuspendsItWithItsReasonAndLogsIt() {
        Developer samuel = member(Role.USER);
        when(userService.findUserOrThrow(MEMBER)).thenReturn(samuel);
        savesAsIs();

        var response = adminUserService.block(ADMIN, MEMBER, "  Spam répété  ");

        assertThat(samuel.isBlocked()).isTrue();
        assertThat(samuel.getBlockedReason()).isEqualTo("Spam répété");
        assertThat(response.isBlocked()).isTrue();
        assertThat(response.getUserType()).isEqualTo("developer");
        verify(auditService).record(ADMIN, AdminActionType.BLOCK_USER,
                new Target(AdminTargetType.USER, MEMBER, "samuel_ngono"), "Spam répété", null);
    }

    @Test
    void anAdministrationAccountCannotBeBlocked() {
        when(userService.findUserOrThrow(OTHER_ADMIN)).thenReturn(admin(OTHER_ADMIN));

        assertThatThrownBy(() -> adminUserService.block(ADMIN, OTHER_ADMIN, "Test"))
                .isInstanceOf(OperationNotAllowedException.class);
        verifyNoInteractions(auditService);
    }

    @Test
    void nobodyBlocksTheirOwnAccount() {
        when(userService.findUserOrThrow(ADMIN)).thenReturn(admin(ADMIN));

        assertThatThrownBy(() -> adminUserService.block(ADMIN, ADMIN, "Test"))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("propre compte");
    }

    @Test
    void anAlreadyBlockedAccountIsNotBlockedTwice() {
        Developer samuel = member(Role.USER);
        samuel.setBlockedAt(Instant.now());
        when(userService.findUserOrThrow(MEMBER)).thenReturn(samuel);

        assertThatThrownBy(() -> adminUserService.block(ADMIN, MEMBER, "Encore"))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void unblockingClearsTheSuspension() {
        Developer samuel = member(Role.USER);
        samuel.setBlockedAt(Instant.now());
        samuel.setBlockedReason("Spam");
        when(userService.findUserOrThrow(MEMBER)).thenReturn(samuel);
        savesAsIs();

        adminUserService.unblock(ADMIN, MEMBER);

        assertThat(samuel.isBlocked()).isFalse();
        assertThat(samuel.getBlockedReason()).isNull();
        verify(auditService).record(eq(ADMIN), eq(AdminActionType.UNBLOCK_USER), any(), isNull(), isNull());
    }

    @Test
    void aMemberBecomesModeratorAndTheChangeIsLogged() {
        Developer samuel = member(Role.USER);
        when(userService.findUserOrThrow(MEMBER)).thenReturn(samuel);
        savesAsIs();

        adminUserService.changeRole(ADMIN, MEMBER, Role.MODERATOR);

        assertThat(samuel.getRole()).isEqualTo(Role.MODERATOR);
        verify(auditService).record(eq(ADMIN), eq(AdminActionType.CHANGE_ROLE), any(), isNull(), eq("USER → MODERATOR"));
    }

    @Test
    void theAdminRoleIsNeverGrantedFromTheBackOffice() {
        assertThatThrownBy(() -> adminUserService.changeRole(ADMIN, MEMBER, Role.ADMIN))
                .isInstanceOf(OperationNotAllowedException.class);
        verifyNoInteractions(userRepository, auditService);
    }

    @Test
    void anAdministrationAccountKeepsItsRole() {
        when(userService.findUserOrThrow(OTHER_ADMIN)).thenReturn(admin(OTHER_ADMIN));

        assertThatThrownBy(() -> adminUserService.changeRole(ADMIN, OTHER_ADMIN, Role.USER))
                .isInstanceOf(OperationNotAllowedException.class);
    }

    @Test
    void givingTheSameRoleChangesNothing() {
        User samuel = member(Role.MODERATOR);
        when(userService.findUserOrThrow(MEMBER)).thenReturn(samuel);

        adminUserService.changeRole(ADMIN, MEMBER, Role.MODERATOR);

        verify(userRepository, never()).saveAndFlush(any());
        verifyNoInteractions(auditService);
    }
}
