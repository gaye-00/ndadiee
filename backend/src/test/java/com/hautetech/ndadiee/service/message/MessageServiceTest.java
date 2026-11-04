package com.hautetech.ndadiee.service.message;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.LongStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;

import com.hautetech.ndadiee.dto.request.MessageRequest;
import com.hautetech.ndadiee.dto.response.ChatEventResponse;
import com.hautetech.ndadiee.dto.response.MessageResponse;
import com.hautetech.ndadiee.dto.response.MessageSliceResponse;
import com.hautetech.ndadiee.event.ChatEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.MessageMapper;
import com.hautetech.ndadiee.mapper.MessageMapperImpl;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.message.Conversation;
import com.hautetech.ndadiee.model.message.ConversationParticipant;
import com.hautetech.ndadiee.model.message.Message;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ConversationParticipantRepository;
import com.hautetech.ndadiee.repository.ConversationRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.MessageRepository;

/** Messages privés : qui voit et écrit quoi, l'envoi sans doublon, et ce qui est annoncé par le WebSocket. */
@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    private static final Long ADA = 1L;
    private static final Long MUSA = 2L;
    private static final Long OUTSIDER = 3L;
    private static final Long CONVERSATION_ID = 10L;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationParticipantRepository participantRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private DeveloperRepository developerRepository;

    @Spy
    private MessageMapper messageMapper = new MessageMapperImpl();

    @Mock
    private UserMapper userMapper;

    @Mock
    private PresenceTracker presenceTracker;

    @Mock
    private ChatNotifier chatNotifier;

    @Mock
    private ApplicationEventPublisher events;

    @InjectMocks
    private MessageService messageService;

    private Developer ada;
    private Developer musa;
    private Conversation conversation;
    private ConversationParticipant adaSeat;
    private ConversationParticipant musaSeat;

    @BeforeEach
    void setUp() {
        ada = Developer.builder().id(ADA).username("ada").fullName("Ada Nwosu").build();
        musa = Developer.builder().id(MUSA).username("musa").fullName("Musa Diallo").build();
        conversation = Conversation.builder().id(CONVERSATION_ID).directKey(Conversation.directKey(ADA, MUSA)).createdBy(ada).build();
        adaSeat = ConversationParticipant.builder().id(100L).conversation(conversation).user(ada).build();
        musaSeat = ConversationParticipant.builder().id(101L).conversation(conversation).user(musa).build();
    }

    private void adaIsInTheConversation() {
        when(participantRepository.findByConversationIdAndUserId(CONVERSATION_ID, ADA)).thenReturn(Optional.of(adaSeat));
    }

    private Message message(long id, Developer sender, String body) {
        return Message.builder().id(id).conversation(conversation).sender(sender).body(body).createdAt(Instant.now()).build();
    }

    // ==================== Accès ====================

    @Test
    void someoneElsesConversation_isNotFound_withoutReadingIt() {
        when(participantRepository.findByConversationIdAndUserId(CONVERSATION_ID, OUTSIDER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.getMessages(OUTSIDER, CONVERSATION_ID, null, 30))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> messageService.send(OUTSIDER, CONVERSATION_ID, MessageRequest.builder().body("Salut").build()))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(messageRepository, events);
    }

    @Test
    void writingToYourself_isRefused() {
        when(developerRepository.findById(ADA)).thenReturn(Optional.of(ada));
        when(developerRepository.findByUsername("ada")).thenReturn(Optional.of(ada));

        assertThatThrownBy(() -> messageService.start(ADA, " Ada "))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void anAdminAccount_hasNoMessaging() {
        when(developerRepository.findById(OUTSIDER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.start(OUTSIDER, "musa")).isInstanceOf(ForbiddenException.class);
    }

    // ==================== Envoi ====================

    @Test
    void send_savesTheMessage_marksItReadForItsAuthor_andAnnouncesItToBothMembers() {
        adaIsInTheConversation();
        when(participantRepository.findOthers(List.of(CONVERSATION_ID), ADA)).thenReturn(List.of(musaSeat));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message saved = invocation.getArgument(0);
            saved.setId(500L);
            saved.setCreatedAt(Instant.now());
            return saved;
        });

        MessageResponse response = messageService.send(ADA, CONVERSATION_ID,
                MessageRequest.builder().body("  Hello Musa!\r\nHow are you?  ").clientId("7f1c2a9e-1111-4c4c-9e9e-123456789abc").build());

        assertThat(response.getBody()).isEqualTo("Hello Musa!\nHow are you?");
        assertThat(response.getSenderId()).isEqualTo(ADA);
        assertThat(conversation.getLastMessageAt()).isNotNull();
        assertThat(adaSeat.getLastReadMessageId()).isEqualTo(500L);

        ArgumentCaptor<ChatEvent> event = ArgumentCaptor.forClass(ChatEvent.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().recipientIds()).containsExactlyInAnyOrder(ADA, MUSA);
        assertThat(event.getValue().payload().getType()).isEqualTo(ChatEventResponse.Type.MESSAGE_CREATED);
        assertThat(event.getValue().payload().getMessage().getId()).isEqualTo(500L);
    }

    @Test
    void send_theSameClientIdTwice_returnsTheSavedMessage_withoutDuplicateNorAnnouncement() {
        adaIsInTheConversation();
        Message already = message(500L, ada, "Hello");
        when(messageRepository.findBySenderIdAndClientId(ADA, "7f1c2a9e-1111")).thenReturn(Optional.of(already));

        MessageResponse response = messageService.send(ADA, CONVERSATION_ID,
                MessageRequest.builder().body("Hello").clientId("7f1c2a9e-1111").build());

        assertThat(response.getId()).isEqualTo(500L);
        verify(messageRepository, never()).save(any());
        verifyNoInteractions(events);
    }

    @Test
    void send_toASuspendedMember_isRefused() {
        adaIsInTheConversation();
        musa.setBlockedAt(Instant.now());
        when(participantRepository.findOthers(List.of(CONVERSATION_ID), ADA)).thenReturn(List.of(musaSeat));

        assertThatThrownBy(() -> messageService.send(ADA, CONVERSATION_ID, MessageRequest.builder().body("Hello").build()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(messageRepository, never()).save(any());
    }

    // ==================== Modification, suppression ====================

    @Test
    void editingSomeoneElsesMessage_isForbidden() {
        adaIsInTheConversation();
        when(messageRepository.findByIdAndConversationId(500L, CONVERSATION_ID)).thenReturn(Optional.of(message(500L, musa, "Salut")));

        assertThatThrownBy(() -> messageService.edit(ADA, CONVERSATION_ID, 500L, "Changed"))
                .isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(events);
    }

    @Test
    void delete_clearsTheText_keepsItsPlace_andAnnouncesIt() {
        adaIsInTheConversation();
        Message mine = message(500L, ada, "Oops");
        when(messageRepository.findByIdAndConversationId(500L, CONVERSATION_ID)).thenReturn(Optional.of(mine));
        when(participantRepository.findUserIds(CONVERSATION_ID)).thenReturn(List.of(ADA, MUSA));

        messageService.delete(ADA, CONVERSATION_ID, 500L);

        assertThat(mine.getBody()).isNull();
        assertThat(mine.isDeleted()).isTrue();
        ArgumentCaptor<ChatEvent> event = ArgumentCaptor.forClass(ChatEvent.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().payload().getType()).isEqualTo(ChatEventResponse.Type.MESSAGE_UPDATED);
        assertThat(event.getValue().payload().getMessage().isDeleted()).isTrue();
        assertThat(event.getValue().payload().getMessage().getBody()).isNull();
    }

    // ==================== Lecture ====================

    @Test
    void markRead_movesTheReadMark_andTellsTheOtherMember() {
        adaIsInTheConversation();
        when(messageRepository.findTopByConversationIdOrderByIdDesc(CONVERSATION_ID)).thenReturn(Optional.of(message(42L, musa, "Salut")));
        when(participantRepository.findUserIds(CONVERSATION_ID)).thenReturn(List.of(ADA, MUSA));

        Long lastRead = messageService.markRead(ADA, CONVERSATION_ID);

        assertThat(lastRead).isEqualTo(42L);
        assertThat(adaSeat.getLastReadMessageId()).isEqualTo(42L);
        ArgumentCaptor<ChatEvent> event = ArgumentCaptor.forClass(ChatEvent.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().payload().getType()).isEqualTo(ChatEventResponse.Type.CONVERSATION_READ);
        assertThat(event.getValue().payload().getUserId()).isEqualTo(ADA);
    }

    @Test
    void markRead_whenNothingNew_announcesNothing() {
        adaSeat.setLastReadMessageId(42L);
        adaIsInTheConversation();
        when(messageRepository.findTopByConversationIdOrderByIdDesc(CONVERSATION_ID)).thenReturn(Optional.of(message(42L, musa, "Salut")));

        messageService.markRead(ADA, CONVERSATION_ID);

        verifyNoInteractions(events);
    }

    // ==================== Fil ====================

    @Test
    void getMessages_returnsOldestFirst_capsTheSlice_andSaysWhenMoreRemain() {
        adaIsInTheConversation();
        // 51 messages, du plus récent au plus ancien, comme les rend le dépôt
        List<Message> newestFirst = LongStream.iterate(151, id -> id - 1).limit(MessageService.MAX_SLICE + 1)
                .mapToObj(id -> message(id, musa, "#" + id)).toList();
        when(messageRepository.findByConversationIdAndIdLessThanOrderByIdDesc(eq(CONVERSATION_ID), eq(200L), any(Pageable.class)))
                .thenReturn(newestFirst);

        MessageSliceResponse slice = messageService.getMessages(ADA, CONVERSATION_ID, 200L, 500);

        assertThat(slice.isHasMore()).isTrue();
        assertThat(slice.getMessages()).hasSize(MessageService.MAX_SLICE);
        assertThat(slice.getMessages().getFirst().getId()).isEqualTo(102L);
        assertThat(slice.getMessages().getLast().getId()).isEqualTo(151L);
    }

    @Test
    void typing_reachesOnlyTheOtherMember() {
        adaIsInTheConversation();
        when(participantRepository.findUserIds(CONVERSATION_ID)).thenReturn(List.of(ADA, MUSA));

        messageService.typing(ADA, CONVERSATION_ID, true);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> recipients = ArgumentCaptor.forClass(List.class);
        verify(chatNotifier).send(recipients.capture(), any(ChatEventResponse.class));
        assertThat(recipients.getValue()).containsExactly(MUSA);
        verify(messageRepository, never()).findTopByConversationIdOrderByIdDesc(anyLong());
        verify(participantRepository, never()).findOthers(anyCollection(), anyLong());
    }
}
