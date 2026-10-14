package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;

import com.hautetech.ndadiee.dto.response.CommentResponse;
import com.hautetech.ndadiee.model.interaction.Comment;

@Mapper(config = MapperConfiguration.class, uses = UserMapper.class)
public interface CommentMapper {

    CommentResponse toResponse(Comment comment);
}
