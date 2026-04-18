package com.example.robotops.application.telemetry.event;


import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import java.sql.Time;
import jdk.jfr.Threshold;

public class EventDetectHandler {

    /**
     * 1. 이벤트 감지
     * 2. 이벤트 처리
    */
    public void handle(TelemetryPayload tp) {


        /**
         이벤트 감지
         원본데이터에서 어떻게 빠르게 감지할수있는지
         Threshold event	기준값
         기준값 이하로 내려가면 이벤트 저장 -> 알림

         Delta event	이전 데이터
         이전값 비교 후, 급변. ->> 캐싱 룰
         Time event 최신값 비교
         캐싱 -> 타임스탬프, 최신값 스케쥴러로 감지

         공통분모 TelemetryRawData,
        */
    }
}
