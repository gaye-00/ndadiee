package com.hautetech.ndadiee.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hautetech.ndadiee.common.ApiResponse;
import com.hautetech.ndadiee.dto.response.UploadResponse;
import com.hautetech.ndadiee.service.media.ImageUploadService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Fichiers")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/uploads")
public class UploadController extends BaseController {

    private final ImageUploadService imageUploadService;

    @Operation(summary = "Envoyer une image (JPEG, PNG, WebP ou GIF, 5 Mo au plus) : son adresse publique, à insérer dans un "
            + "contenu Markdown du forum")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadResponse>> uploadImage(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                imageUploadService.uploadImage(getAuthenticatedUserId(), file), "Image envoyée"));
    }
}
