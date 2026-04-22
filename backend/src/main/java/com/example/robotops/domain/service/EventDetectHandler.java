package com.example.robotops.domain.service;


import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventDetectHandler {


    /**
     * 1. 이벤트 감지
     * 2. 이벤트 처리
    */
    public void thresholdEventHandle(TelemetryPayload tp) {


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

    private void alphaEvent(TelemetryPayload tp) {
    }




    /**
     *
     * 1차 감지
     * 2차 상태비교 (이전값이랑 비교)
     * 3차 집계
     *
     */
    private boolean isOffline(TelemetryPayload tp) {
        return !Boolean.TRUE.equals(tp.state().online());
    }

    private boolean isBumper(TelemetryPayload tp) {
        return Boolean.TRUE.equals(tp.safety().bumper());
    }

    private boolean isEmergencyStop(TelemetryPayload tp) {
        return Boolean.TRUE.equals(tp.safety().estop());
    }

    private boolean isObstacle(TelemetryPayload tp) {
        return Boolean.TRUE.equals(tp.safety().obstacle());
    }

    private boolean isLowBattery(TelemetryPayload tp) {
        return tp.state().batteryPct() != null && tp.state().batteryPct() < 20;
    }


    public boolean isOverheated(TelemetryPayload tp) {
        return tp.health().tempC() != null && tp.health().tempC() >= 80;
    }



    /**
     *
     *  레벨 중 정도
    */

    public boolean isIdle(TelemetryPayload tp) {
        return "IDLE".equalsIgnoreCase(tp.state().mission());
    }
    public boolean isCharging(TelemetryPayload tp) {
        return "CHARGE".equalsIgnoreCase(tp.state().mission());
    }


    // 속도 비교
    private boolean isOverSpeed(TelemetryPayload tp) {
        return tp.state().speedMps() != null && tp.state().batteryPct() < tp.state().speedMps();
    }

    private boolean isLowBattery1(TelemetryPayload tp) {
        return tp.state().batteryPct() != null && tp.state().batteryPct() < 20;
    }


    public boolean isOverheated1(TelemetryPayload tp) {
        return tp.health().tempC() != null && tp.health().tempC() >= 80;
    }

    // 아에 에러코드가 온거
    // 룰 병렬처리


}
