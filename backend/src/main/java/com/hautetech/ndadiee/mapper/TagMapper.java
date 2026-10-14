package com.hautetech.ndadiee.mapper;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;

import org.mapstruct.Mapper;

import com.hautetech.ndadiee.dto.response.TagResponse;
import com.hautetech.ndadiee.model.content.Tag;

@Mapper(config = MapperConfiguration.class)
public interface TagMapper {

    TagResponse toResponse(Tag tag);

    // Les tags sont stockés dans des Set : on les trie pour un affichage stable
    default List<TagResponse> toResponses(Collection<Tag> tags) {
        if (tags == null) {
            return List.of();
        }
        return tags.stream()
                .sorted(Comparator.comparing(Tag::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();
    }
}
