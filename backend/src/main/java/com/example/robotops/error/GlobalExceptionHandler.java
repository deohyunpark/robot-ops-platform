package com.example.robotops.error;

import com.example.robotops.error.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RobotOpsException.class)
    public ResponseEntity<ApiErrorResponse> handleRobotOpsException(
            RobotOpsException exception,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = exception.getErrorCode();

        log.error(
                "RobotOpsException. code={}, path={}, context={}",
                errorCode.getCode(),
                request.getRequestURI(),
                exception.getContext(),
                exception
        );

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(
                        ApiErrorResponse.of(
                                errorCode,
                                request.getRequestURI()
                        )
                );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        return ResponseEntity
                .badRequest()
                .body(
                        ApiErrorResponse.of(
                                ErrorCode.INVALID_REQUEST,
                                request.getRequestURI()
                        )
                );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnknown(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error(
                "Unexpected exception. path={}",
                request.getRequestURI(),
                exception
        );

        return ResponseEntity
                .internalServerError()
                .body(
                        new ApiErrorResponse(
                                "COMMON_999",
                                "서버 내부 오류가 발생했습니다.",
                                OffsetDateTime.now(ZoneId.of("Asia/Seoul")),
                                request.getRequestURI()
                        )
                );
    }
}
