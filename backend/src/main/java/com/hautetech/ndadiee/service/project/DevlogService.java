package com.hautetech.ndadiee.service.project;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.DevlogEntryRequest;
import com.hautetech.ndadiee.dto.response.DevlogEntryResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.DevlogEntry;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.DevlogEntryRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Devlog d'un projet (design 3D) : ce qui change, version après version. Lecture publique ; seule
 * l'équipe du projet y écrit.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class DevlogService {

    private final DevlogEntryRepository devlogRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final ProjectMapper projectMapper;

    @Transactional(readOnly = true)
    public PageResponse<DevlogEntryResponse> list(Long projectId, Long currentUserId, Pageable pageable) {
        projectService.findVisibleProjectOrThrow(projectId, currentUserId);
        Page<DevlogEntry> page = devlogRepository.findByProjectId(projectId, pageable);
        return PageResponse.from(page, page.getContent().stream().map(projectMapper::toDevlogResponse).toList());
    }

    public DevlogEntryResponse create(Long userId, Long projectId, DevlogEntryRequest request) {
        Project project = projectService.findProjectOrThrow(projectId);
        if (!projectService.isTeamMember(project, userId)) {
            throw new ForbiddenException("Seule l'équipe du projet écrit son devlog");
        }

        DevlogEntry saved = devlogRepository.save(DevlogEntry.builder()
                .project(project)
                .author(userService.getDeveloperOrThrow(userId))
                .version(request.getVersion() == null || request.getVersion().isBlank() ? null : request.getVersion().trim())
                .body(request.getBody().strip())
                .build());
        log.info("[Devlog] Entrée {} - projet {} - par {}", saved.getId(), projectId, userId);
        return projectMapper.toDevlogResponse(saved);
    }
}
