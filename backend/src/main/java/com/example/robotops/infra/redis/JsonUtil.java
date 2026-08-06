package com.example.robotops.infra.redis;

import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JsonUtil {

    private final ObjectMapper objectMapper;

    public String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RobotOpsException(
                    ErrorCode.MESSAGE_SERIALIZATION_FAILED,
                    Map.of(
                            "payloadType",
                            obj.getClass().getSimpleName()
                    ),
                    e
            );
        }
    }

    public <T> T fromJson(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            throw new RobotOpsException(
                    ErrorCode.MESSAGE_DESERIALIZATION_FAILED,
                    Map.of(
                            "targetType", clazz.getSimpleName()
                    ),
                    e
            );
        }
    }
}
