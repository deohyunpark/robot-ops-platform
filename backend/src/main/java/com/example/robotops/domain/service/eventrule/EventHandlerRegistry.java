package com.example.robotops.domain.service.eventrule;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.response.eventpayload.PayloadType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EventHandlerRegistry {

    // todo : 이벤트 분리 후, 중복방지 필요 + 해결테이블
    @Bean
    public EventHandler offlineHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::offline,
                EventType.OFFLINE,
                Severity.CRITICAL,
                PayloadType.OFFLINE
        );
    }

    @Bean
    public EventHandler bumperHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::bumper,
                EventType.COLLISION,
                Severity.CRITICAL,
                PayloadType.COLLISION
        );
    }

    @Bean
    public EventHandler emergencyStopHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::emergencyStop,
                EventType.EMERGENCY_STOP,
                Severity.CRITICAL,
                PayloadType.EMERGENCY_STOP
        );
    }

    @Bean
    public EventHandler obstacleHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::obstacle,
                EventType.OBSTACLE,
                Severity.CRITICAL,
                PayloadType.OBSTACLE_DETECTED
        );
    }

    @Bean
    public EventHandler overheatHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::overheat,
                EventType.OVERHEAT,
                Severity.CRITICAL,
                PayloadType.OVERHEAT
        );
    }

    @Bean
    public EventHandler lowBatteryHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::lowBattery,
                EventType.LOW_BATTERY,
                Severity.WARNING,
                PayloadType.LOW_BATTERY
        );
    }

    @Bean
    public EventHandler idleHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::idle,
                EventType.IDLE,
                Severity.INFO,
                PayloadType.IDLE
        );
    }

    @Bean
    public EventHandler chargingHandler(RealtimeRule realtimeRule) {
        return new EventHandler(
                realtimeRule::charging,
                EventType.CHARGING,
                Severity.INFO,
                PayloadType.CHARGING
        );
    }

    @Bean
    public EventHandler speedTrendHandler(StatefulRule statefulRule) {
        return new EventHandler(
                statefulRule::isTrendingUp,
                EventType.SPEED_RISING,
                Severity.INFO,
                PayloadType.CHARGING
        );
    }

    @Bean
    public EventHandler cpuWindowHandler(StatefulRule statefulRule) {
        return new EventHandler(
                cxt -> statefulRule.isHighOverTime(cxt, "cpu"),
                EventType.CPU_RISING,
                Severity.INFO,
                PayloadType.CHARGING
        );
    }

    @Bean
    public EventHandler tempWindowHandler(StatefulRule statefulRule) {
        return new EventHandler(
                cxt -> statefulRule.isHighOverTime(cxt, "temp"),
                EventType.TEMP_RISING,
                Severity.INFO,
                PayloadType.CHARGING
        );
    }
}
