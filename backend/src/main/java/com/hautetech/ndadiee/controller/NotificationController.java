package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.NotificationResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.service.notification.NotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Notifications")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/notifications")
public class NotificationController extends BaseController {

    private final NotificationService notificationService;

    @Operation(summary = "Mes notifications, les plus récentes d'abord")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getMine(
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getMine(getAuthenticatedUserId(), pageable), "Notifications récupérées avec succès"));
    }

    @Operation(summary = "Nombre de notifications non lues (pastille de la cloche)")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> countUnread() {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.countUnread(getAuthenticatedUserId()), "Compteur récupéré avec succès"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.markAsRead(getAuthenticatedUserId(), id), "Notification marquée comme lue"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Integer>> markAllAsRead() {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.markAllAsRead(getAuthenticatedUserId()), "Notifications marquées comme lues"));
    }
}
