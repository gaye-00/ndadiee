package com.hautetech.ndadiee.controller;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.request.MessageRequest;
import com.hautetech.ndadiee.dto.request.MessageUpdateRequest;
import com.hautetech.ndadiee.dto.request.StartConversationRequest;
import com.hautetech.ndadiee.dto.response.ConversationResponse;
import com.hautetech.ndadiee.dto.response.MessageResponse;
import com.hautetech.ndadiee.dto.response.MessageSliceResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.service.message.MessageService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Messages privés. Envoyer, modifier, supprimer et lire passent par ici ; le WebSocket (/api/ws, file
 * /user/queue/chat) annonce ensuite chaque changement aux deux membres, en temps réel.
 */
@Tag(name = "Messages")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/conversations")
public class ConversationController extends BaseController {

    private final MessageService messageService;

    @Operation(summary = "Mes conversations, la plus récemment active d'abord")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ConversationResponse>>> getMine(
            @ParameterObject @PageableDefault(size = 30) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.getMine(getAuthenticatedUserId(), pageable), "Conversations récupérées avec succès"));
    }

    @Operation(summary = "Nombre de conversations avec des messages non lus (pastille de la messagerie)")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> countUnread() {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.countUnread(getAuthenticatedUserId()), "Compteur récupéré avec succès"));
    }

    @Operation(summary = "Ouvrir la conversation avec un membre (celle qui existe déjà, sinon une nouvelle)")
    @PostMapping
    public ResponseEntity<ApiResponse<ConversationResponse>> start(@Valid @RequestBody StartConversationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.start(getAuthenticatedUserId(), request.getUsername()), "Conversation ouverte"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConversationResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.get(getAuthenticatedUserId(), id), "Conversation récupérée avec succès"));
    }

    @Operation(summary = "Une tranche de messages, du plus ancien au plus récent ; before : remonter le fil")
    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<MessageSliceResponse>> getMessages(
            @PathVariable Long id,
            @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.getMessages(getAuthenticatedUserId(), id, before, size), "Messages récupérés avec succès"));
    }

    @Operation(summary = "Envoyer un message ; un clientId déjà envoyé rend le message existant, sans doublon")
    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<MessageResponse>> send(@PathVariable Long id, @Valid @RequestBody MessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                messageService.send(getAuthenticatedUserId(), id, request), "Message envoyé"));
    }

    @PatchMapping("/{id}/messages/{messageId}")
    public ResponseEntity<ApiResponse<MessageResponse>> edit(
            @PathVariable Long id, @PathVariable Long messageId, @Valid @RequestBody MessageUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.edit(getAuthenticatedUserId(), id, messageId, request.getBody()), "Message modifié"));
    }

    @DeleteMapping("/{id}/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, @PathVariable Long messageId) {
        messageService.delete(getAuthenticatedUserId(), id, messageId);
        return ResponseEntity.ok(ApiResponse.success(null, "Message supprimé"));
    }

    @Operation(summary = "Tout marquer comme lu, jusqu'au dernier message")
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Long>> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                messageService.markRead(getAuthenticatedUserId(), id), "Conversation lue"));
    }
}
