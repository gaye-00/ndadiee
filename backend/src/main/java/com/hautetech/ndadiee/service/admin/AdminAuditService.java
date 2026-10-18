package com.hautetech.ndadiee.service.admin;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.AdminActionResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.mapper.AdminMapper;
import com.hautetech.ndadiee.model.admin.AdminAction;
import com.hautetech.ndadiee.model.admin.AdminActionType;
import com.hautetech.ndadiee.model.admin.AdminTargetType;
import com.hautetech.ndadiee.repository.AdminActionRepository;
import com.hautetech.ndadiee.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Le journal de l'administration : chaque décision du back-office y laisse une ligne, dans la même transaction
 * que la décision elle-même (l'une ne va pas sans l'autre). Le journal ne s'efface pas.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AdminAuditService {

    // Longueur de la colonne target_label
    private static final int LABEL_LENGTH = 255;

    private final AdminActionRepository actionRepository;
    private final UserRepository userRepository;
    private final AdminMapper adminMapper;

    /** Ce sur quoi porte une décision, avec son libellé du moment (nom d'utilisateur, titre). */
    public record Target(AdminTargetType type, Long id, String label) {
    }

    /**
     * @param reason motif donné par l'admin, s'il y en a un
     * @param detail précision de l'action (« USER → MODERATOR »), s'il y en a une
     */
    public void record(Long adminId, AdminActionType action, Target target, String reason, String detail) {
        String label = target.label().length() > LABEL_LENGTH ? target.label().substring(0, LABEL_LENGTH - 1) + "…" : target.label();
        actionRepository.save(AdminAction.builder()
                .admin(userRepository.getReferenceById(adminId))
                .action(action)
                .targetType(target.type())
                .targetId(target.id())
                .targetLabel(label)
                .reason(reason)
                .detail(detail)
                .build());
        log.info("[Admin] {} - {} {} « {} » par {}", action, target.type(), target.id(), label, adminId);
    }

    /** Le journal, les dernières décisions d'abord ; seulement celles sur ce type de cible, s'il est donné. */
    @Transactional(readOnly = true)
    public PageResponse<AdminActionResponse> list(AdminTargetType targetType, Pageable pageable) {
        Pageable newest = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        Page<AdminAction> page = targetType == null
                ? actionRepository.findAll(newest)
                : actionRepository.findByTargetType(targetType, newest);
        return PageResponse.from(page.map(adminMapper::toActionResponse));
    }

    /** Les dernières décisions, pour l'accueil du back-office. */
    @Transactional(readOnly = true)
    public List<AdminActionResponse> recent() {
        return actionRepository.findTop6ByOrderByCreatedAtDescIdDesc().stream()
                .map(adminMapper::toActionResponse)
                .toList();
    }
}
