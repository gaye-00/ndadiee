package com.hautetech.ndadiee.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.hautetech.ndadiee.model.user.Permission;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.security.AccessDeniedHandleErrors;
import com.hautetech.ndadiee.security.AuthEntryPointHandleErrors;
import com.hautetech.ndadiee.security.JwtService;
import com.hautetech.ndadiee.security.SecurityConfiguration;
import com.hautetech.ndadiee.service.admin.AdminAuditService;
import com.hautetech.ndadiee.service.admin.AdminContentService;
import com.hautetech.ndadiee.service.admin.AdminOverviewService;
import com.hautetech.ndadiee.service.admin.AdminUserService;
import com.hautetech.ndadiee.storage.FileStorage;

/**
 * Le back-office n'ouvre qu'aux comptes d'administration, derrière deux barrières : les règles d'URL
 * (permissions admin:*) et @PreAuthorize("hasRole('ADMIN')") sur le contrôleur. Chacune tient seule.
 */
@WebMvcTest(AdminController.class)
@Import({ SecurityConfiguration.class, AuthEntryPointHandleErrors.class, AccessDeniedHandleErrors.class })
class AdminSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminOverviewService overviewService;

    @MockitoBean
    private AdminUserService adminUserService;

    @MockitoBean
    private AdminContentService contentService;

    @MockitoBean
    private AdminAuditService auditService;

    // Dépendances de la chaîne de sécurité et de WebConfig : le jeton n'est pas en jeu ici
    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private AuthenticationProvider authenticationProvider;

    @MockitoBean
    private FileStorage fileStorage;

    private static RequestPostProcessor as(Role role) {
        return user(role.name().toLowerCase()).authorities(role.getAuthorities());
    }

    @Test
    void aVisitorMustSignIn() throws Exception {
        mockMvc.perform(get("/v1/admin/overview"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void aMemberIsRefused() throws Exception {
        mockMvc.perform(get("/v1/admin/overview").with(as(Role.USER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void aModeratorIsRefusedToo() throws Exception {
        mockMvc.perform(get("/v1/admin/users").with(as(Role.MODERATOR))).andExpect(status().isForbidden());
        mockMvc.perform(post("/v1/admin/users/2/block").with(as(Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Spam\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/v1/admin/content/QUESTION/12").with(as(Role.MODERATOR)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminGetsIn() throws Exception {
        mockMvc.perform(get("/v1/admin/overview").with(as(Role.ADMIN))).andExpect(status().isOk());
    }

    @Test
    void theAdminRoleAloneDoesNotPassTheUrlRules() throws Exception {
        mockMvc.perform(get("/v1/admin/overview")
                        .with(user("forged").authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))))
                .andExpect(status().isForbidden());
    }

    @Test
    void thePermissionAloneDoesNotPassTheControllerGuard() throws Exception {
        mockMvc.perform(get("/v1/admin/overview")
                        .with(user("forged").authorities(List.of(new SimpleGrantedAuthority(Permission.ADMIN_READ.getPermission())))))
                .andExpect(status().isForbidden());
    }
}
