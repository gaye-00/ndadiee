package com.hautetech.ndadiee.event;

import java.util.Collection;

import com.hautetech.ndadiee.dto.response.ChatEventResponse;

/**
 * Un événement de la messagerie à pousser par le WebSocket à ces membres, une fois la transaction validée : un message
 * qui n'a pas été enregistré n'est jamais annoncé.
 */
public record ChatEvent(Collection<Long> recipientIds, ChatEventResponse payload) {
}
