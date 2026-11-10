package com.hautetech.ndadiee.service.message;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.MessageRequest;
import com.hautetech.ndadiee.dto.response.ChatEventResponse;
import com.hautetech.ndadiee.dto.response.ConversationResponse;
import com.hautetech.ndadiee.dto.response.MessageResponse;
import com.hautetech.ndadiee.dto.response.MessageSliceResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.event.ChatEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.MessageMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.message.Conversation;
import com.hautetech.ndadiee.model.message.ConversationParticipant;
import com.hautetech.ndadiee.model.message.Message;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ConversationParticipantRepository;
import com.hautetech.ndadiee.repository.ConversationRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.MessageRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Messages privés entre membres de la communauté.
 *
 * Tout ce qui change passe par ici et est annoncé par le WebSocket une fois enregistré (ChatNotifier) : le message
 * envoyé, modifié ou supprimé à ses deux membres (et à chacune de leurs sessions), la lecture à l'autre membre
 * (« Vu ») comme aux autres onglets de celui qui lit. On ne voit, ni n'écrit, que dans ses propres conversations :
 * celle d'un autre est introuvable (404), sans dire qu'elle existe.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class MessageService {

    /** Taille maximale d'une tranche de messages */
    public static final int MAX_SLICE = 50;

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final DeveloperRepository developerRepository;
    private final MessageMapper messageMapper;
    private final UserMapper userMapper;
    private final PresenceTracker presenceTracker;
    private final ChatNotifier chatNotifier;
    private final ApplicationEventPublisher events;

    // ==================== CONVERSATIONS ====================

    /** Mes conversations, la plus récemment active d'abord. */
    @Transactional(readOnly = true)
    public PageResponse<ConversationResponse> getMine(Long userId, Pageable pageable) {
        Page<ConversationParticipant> page = participantRepository.findInbox(
                userId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
        return PageResponse.from(page, toResponses(userId, page.getContent()));
    }

    @Transactional(readOnly = true)
    public ConversationResponse get(Long userId, Long conversationId) {
        return toResponses(userId, List.of(participant(userId, conversationId))).getFirst();
    }

    /** Les conversations où un message attend d'être lu : la pastille de la messagerie. */
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return participantRepository.countUnreadConversations(userId);
    }

    /**
     * La conversation avec ce membre : celle qui existe déjà, ou une nouvelle. Une nouvelle conversation n'apparaît
     * chez l'autre qu'au premier message.
     */
    public ConversationResponse start(Long userId, String username) {
        Developer me = developerRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException("Seuls les membres de la communauté échangent des messages"));
        String wanted = username.trim().toLowerCase();
        // Un compte suspendu ou supprimé ne reçoit plus de messages : il est introuvable, comme son profil
        Developer other = developerRepository.findByUsername(wanted)
                .filter(developer -> !developer.isBlocked() && !developer.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Membre", "username", wanted));
        if (other.getId().equals(userId)) {
            throw new OperationNotAllowedException("Tu ne peux pas t'écrire à toi-même", "username");
        }

        String key = Conversation.directKey(userId, other.getId());
        Conversation conversation = conversationRepository.findByDirectKey(key).orElseGet(() -> create(me, other, key));
        return get(userId, conversation.getId());
    }

    // ==================== MESSAGES ====================

    /**
     * Une tranche de la conversation, du plus ancien au plus récent : les derniers messages, ou ceux d'avant
     * {@code before} quand on remonte le fil.
     */
    @Transactional(readOnly = true)
    public MessageSliceResponse getMessages(Long userId, Long conversationId, Long before, int size) {
        participant(userId, conversationId);
        int limit = Math.clamp(size, 1, MAX_SLICE);
        // Un de plus que demandé : s'il existe, des messages plus anciens restent à lire
        Pageable slice = PageRequest.of(0, limit + 1);
        List<Message> found = before == null
                ? messageRepository.findByConversationIdOrderByIdDesc(conversationId, slice)
                : messageRepository.findByConversationIdAndIdLessThanOrderByIdDesc(conversationId, before, slice);

        List<MessageResponse> messages = new ArrayList<>(found.stream().limit(limit).map(messageMapper::toResponse).toList());
        Collections.reverse(messages);
        return new MessageSliceResponse(messages, found.size() > limit);
    }

    public MessageResponse send(Long userId, Long conversationId, MessageRequest request) {
        ConversationParticipant mine = participant(userId, conversationId);

        // Même envoi répété (réseau coupé avant la réponse) : le message déjà enregistré, sans doublon ni nouvelle annonce
        if (request.getClientId() != null) {
            Optional<Message> already = messageRepository.findBySenderIdAndClientId(userId, request.getClientId());
            if (already.isPresent()) {
                if (!already.get().getConversation().getId().equals(conversationId)) {
                    throw new OperationNotAllowedException("Identifiant client déjà utilisé", "clientId");
                }
                return messageMapper.toResponse(already.get());
            }
        }

        List<ConversationParticipant> others = participantRepository.findOthers(List.of(conversationId), userId);
        if (others.stream().anyMatch(other -> other.getUser().isBlocked())) {
            throw new OperationNotAllowedException("Ce membre ne peut plus recevoir de messages");
        }

        Conversation conversation = mine.getConversation();
        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .sender(mine.getUser())
                .body(clean(request.getBody()))
                .clientId(request.getClientId())
                .build());
        conversation.setLastMessageAt(message.getCreatedAt());
        // Écrire, c'est avoir lu tout ce qui précède
        mine.setLastReadMessageId(message.getId());
        mine.setLastReadAt(message.getCreatedAt());

        MessageResponse response = messageMapper.toResponse(message);
        List<Long> members = Stream.concat(Stream.of(userId), others.stream().map(other -> other.getUser().getId())).toList();
        events.publishEvent(new ChatEvent(members, ChatEventResponse.messageCreated(response)));
        return response;
    }

    /** Son auteur le corrige : il porte alors la date de la modification. */
    public MessageResponse edit(Long userId, Long conversationId, Long messageId, String body) {
        participant(userId, conversationId);
        Message message = ownMessage(userId, conversationId, messageId);
        String cleaned = clean(body);
        if (!cleaned.equals(message.getBody())) {
            message.setBody(cleaned);
            message.setEditedAt(Instant.now());
            announceUpdate(conversationId, message);
        }
        return messageMapper.toResponse(message);
    }

    /** Son auteur le supprime : le texte est effacé, la place du message reste. */
    public void delete(Long userId, Long conversationId, Long messageId) {
        participant(userId, conversationId);
        Message message = ownMessage(userId, conversationId, messageId);
        message.setBody(null);
        message.setDeletedAt(Instant.now());
        announceUpdate(conversationId, message);
    }

    /**
     * Tout est lu, jusqu'au dernier message. L'autre membre l'apprend (« Vu »), comme les autres sessions de celui qui
     * lit (leur pastille s'éteint).
     *
     * @return le dernier message lu ; null si la conversation est vide
     */
    public Long markRead(Long userId, Long conversationId) {
        ConversationParticipant mine = participant(userId, conversationId);
        Optional<Long> latest = messageRepository.findTopByConversationIdOrderByIdDesc(conversationId).map(Message::getId);
        if (latest.isEmpty()) {
            return null;
        }
        Long latestId = latest.get();
        if (mine.getLastReadMessageId() == null || mine.getLastReadMessageId() < latestId) {
            mine.setLastReadMessageId(latestId);
            mine.setLastReadAt(Instant.now());
            events.publishEvent(new ChatEvent(participantRepository.findUserIds(conversationId),
                    ChatEventResponse.read(conversationId, userId, latestId)));
        }
        return mine.getLastReadMessageId();
    }

    /** « En train d'écrire » : rien n'est enregistré, l'autre membre l'apprend tout de suite. */
    @Transactional(readOnly = true)
    public void typing(Long userId, Long conversationId, boolean typing) {
        participant(userId, conversationId);
        List<Long> others = participantRepository.findUserIds(conversationId).stream()
                .filter(id -> !id.equals(userId))
                .toList();
        chatNotifier.send(others, ChatEventResponse.typing(conversationId, userId, typing));
    }

    // ==================== HELPERS ====================

    private Conversation create(Developer me, Developer other, String key) {
        Conversation conversation = conversationRepository.save(Conversation.builder()
                .directKey(key)
                .createdBy(me)
                .build());
        participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(me).build());
        participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(other).build());
        log.info("[Chat] Conversation {} ouverte entre les membres {} et {}", conversation.getId(), me.getId(), other.getId());
        return conversation;
    }

    // Sa place dans la conversation ; celle d'un autre est introuvable
    private ConversationParticipant participant(Long userId, Long conversationId) {
        return participantRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));
    }

    private Message ownMessage(Long userId, Long conversationId, Long messageId) {
        Message message = messageRepository.findByIdAndConversationId(messageId, conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        if (!message.getSender().getId().equals(userId)) {
            throw new ForbiddenException("Seul l'auteur d'un message peut le modifier");
        }
        if (message.isDeleted()) {
            throw new OperationNotAllowedException("Ce message a été supprimé");
        }
        return message;
    }

    private void announceUpdate(Long conversationId, Message message) {
        events.publishEvent(new ChatEvent(participantRepository.findUserIds(conversationId),
                ChatEventResponse.messageUpdated(messageMapper.toResponse(message))));
    }

    // Fins de ligne unifiées, espaces du début et de la fin retirés ; les sauts de ligne du milieu restent
    private static String clean(String body) {
        String cleaned = body.replace("\r\n", "\n").strip();
        if (cleaned.isEmpty()) {
            throw new OperationNotAllowedException("Le message est vide", "body");
        }
        return cleaned;
    }

    /** Les conversations, vues par ce membre : l'autre membre, le dernier message, les non-lus. Quatre requêtes en tout. */
    private List<ConversationResponse> toResponses(Long userId, List<ConversationParticipant> mine) {
        if (mine.isEmpty()) {
            return List.of();
        }
        List<Long> ids = mine.stream().map(participant -> participant.getConversation().getId()).toList();
        Map<Long, ConversationParticipant> others = participantRepository.findOthers(ids, userId).stream()
                .collect(Collectors.toMap(participant -> participant.getConversation().getId(), Function.identity(), (a, b) -> a));
        Map<Long, Message> lastMessages = messageRepository.findLastMessages(ids).stream()
                .collect(Collectors.toMap(message -> message.getConversation().getId(), Function.identity()));
        Map<Long, Long> unread = messageRepository.countUnread(userId, ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        return mine.stream().map(participant -> {
            Conversation conversation = participant.getConversation();
            ConversationParticipant other = others.get(conversation.getId());
            Message last = lastMessages.get(conversation.getId());
            return ConversationResponse.builder()
                    .id(conversation.getId())
                    .participant(other == null ? null : userMapper.toSummary(other.getUser()))
                    .online(other != null && presenceTracker.isOnline(other.getUser().getId()))
                    .lastMessage(last == null ? null : messageMapper.toResponse(last))
                    .unreadCount(unread.getOrDefault(conversation.getId(), 0L))
                    .lastReadMessageId(participant.getLastReadMessageId())
                    .participantLastReadMessageId(other == null ? null : other.getLastReadMessageId())
                    .lastMessageAt(conversation.getLastMessageAt())
                    .createdAt(conversation.getCreatedAt())
                    .build();
        }).toList();
    }
}
