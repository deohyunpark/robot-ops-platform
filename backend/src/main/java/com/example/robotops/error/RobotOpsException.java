package com.example.robotops.error;

import java.util.Map;
import lombok.Getter;

@Getter
public class RobotOpsException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Map<String, Object> context;

    public RobotOpsException(ErrorCode errorCode) {
        this(errorCode, Map.of(), null);
    }

    public RobotOpsException(
            ErrorCode errorCode,
            Throwable cause
    ) {
        this(errorCode, Map.of(), cause);
    }

    public RobotOpsException(
            ErrorCode errorCode,
            Map<String, Object> context,
            Throwable cause
    ) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
        this.context = Map.copyOf(context);
    }
}
