package com.hautetech.ndadiee.service.notification;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.NotificationResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.NotificationMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.notification.Notification;
import com.hautetech.ndadiee.model.notification.NotificationType;
import com.hautetech.ndadiee.repository.BadgeRepository;
import com.hautetech.ndadiee.repository.NotificationRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.interaction.ContentTargetService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final BadgeRepository badgeRepository;
    private final ContentTargetService contentTargetService;
    private final NotificationMapper notificationMapper;

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMine(Long userId, Pageable pageable) {
        // Toujours de la plus récente à la plus ancienne
        Pageable newestFirst = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return PageResponse.from(notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId, newestFirst)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        // Recherche par destinataire : on ne peut pas lire ni marquer la notification d'un autre
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));
        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    /** @return le nombre de notifications passées à « lue » */
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsRead(userId);
    }

    /**
     * Crée une notification. On ne notifie jamais quelqu'un de sa propre action.
     *
     * @param actorId    auteur de l'action ; null pour une notification système
     * @param targetType type du contenu concerné ; null si la cible n'est pas un contenu
     */
    public void notify(Long recipientId, Long actorId, NotificationType type, ContentType targetType, Long targetId) {
        if (recipientId.equals(actorId)) {
            return;
        }
        notificationRepository.save(Notification.builder()
                .recipient(userRepository.getReferenceById(recipientId))
                .actor(actorId == null ? null : userRepository.getReferenceById(actorId))
                .type(type)
                .targetType(targetType)
                .targetId(targetId)
                .build());
        log.info("[Notification] {} pour le membre {}", type, recipientId);
    }

    // ==================== HELPERS ====================

    // Ajoute le slug et le titre de la cible, dont le front a besoin pour construire le lien
    private NotificationResponse toResponse(Notification notification) {
        NotificationResponse response = notificationMapper.toResponse(notification);
        if (notification.getTargetId() == null) {
            return response;
        }

        if (notification.getType() == NotificationType.BADGE_EARNED) {
            badgeRepository.findById(notification.getTargetId())
                    .ifPresent(badge -> response.setTargetTitle(badge.getName()));
        } else if (notification.getTargetType() != null) {
            // Le contenu a pu être supprimé depuis : la notification reste, sans lien
            contentTargetService.find(notification.getTargetType(), notification.getTargetId())
                    .ifPresent(target -> {
                        response.setTargetSlug(target.slug());
                        response.setTargetTitle(target.title());
                    });
        }
        return response;
    }
}
