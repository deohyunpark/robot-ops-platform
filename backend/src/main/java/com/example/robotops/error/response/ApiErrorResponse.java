package com.example.robotops.error.response;

import com.example.robotops.error.ErrorCode;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import lombok.Builder;

@Builder
public record ApiErrorResponse(
        String code,
        String message,
        OffsetDateTime timestamp,
        String path
) {

    public static ApiErrorResponse of(
            ErrorCode errorCode,
            String path
    ) {
        return new ApiErrorResponse(
                errorCode.getCode(),
                errorCode.getMessage(),
                OffsetDateTime.now(ZoneId.of("Asia/Seoul")),
                path
        );
    }
}
