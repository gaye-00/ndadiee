package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.MessageResponse;
import com.hautetech.ndadiee.model.message.Message;

@Mapper(config = MapperConfiguration.class)
public interface MessageMapper {

    // L'identifiant d'une relation LAZY se lit sans la charger
    @Mapping(target = "conversationId", source = "conversation.id")
    @Mapping(target = "senderId", source = "sender.id")
    MessageResponse toResponse(Message message);
}
