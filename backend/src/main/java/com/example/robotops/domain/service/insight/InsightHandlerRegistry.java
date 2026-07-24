package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.deviceStateType.InsightType;
import com.example.robotops.domain.response.eventpayload.PayloadType;
import com.example.robotops.domain.service.event.RealtimeRule;
import com.example.robotops.domain.service.event.StatefulRule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InsightHandlerRegistry {
    @Bean
    public InsightHandler offlineInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::offline,
//                RiskLevel.HIGH,
                InsightType.OFFLINE.getTitle(),
                InsightType.OFFLINE.getDescription(),
                InsightType.OFFLINE.getRecommendation(),
                PayloadType.OFFLINE,
                InsightType.OFFLINE.getScore()
        );
    }

    @Bean
    public InsightHandler bumperInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::bumper,
//                RiskLevel.HIGH,
                InsightType.COLLISION.getTitle(),
                InsightType.COLLISION.getDescription(),
                InsightType.COLLISION.getRecommendation(),
                PayloadType.COLLISION,
                InsightType.COLLISION.getScore()
        );
    }

    @Bean
    public InsightHandler emergencyStopInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::emergencyStop,
//                RiskLevel.HIGH,
                InsightType.EMERGENCY_STOP.getTitle(),
                InsightType.EMERGENCY_STOP.getDescription(),
                InsightType.EMERGENCY_STOP.getRecommendation(),
                PayloadType.EMERGENCY_STOP,
                InsightType.EMERGENCY_STOP.getScore()
        );
    }

    @Bean
    public InsightHandler obstacleInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::obstacle,
//                RiskLevel.MIDDLE,
                InsightType.OBSTACLE.getTitle(),
                InsightType.OBSTACLE.getDescription(),
                InsightType.OBSTACLE.getRecommendation(),
                PayloadType.OBSTACLE_DETECTED,
                InsightType.OBSTACLE.getScore()
        );
    }

    @Bean
    public InsightHandler overheatInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::overheat,
//                RiskLevel.HIGH,
                InsightType.OVERHEAT.getTitle(),
                InsightType.OVERHEAT.getDescription(),
                InsightType.OVERHEAT.getRecommendation(),
                PayloadType.OVERHEAT,
                InsightType.OVERHEAT.getScore()
        );
    }

    @Bean
    public InsightHandler lowBatteryInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::lowBattery,
//                RiskLevel.HIGH,
                InsightType.LOW_BATTERY.getTitle(),
                InsightType.LOW_BATTERY.getDescription(),
                InsightType.LOW_BATTERY.getRecommendation(),
                PayloadType.LOW_BATTERY,
                InsightType.LOW_BATTERY.getScore()
        );
    }

    @Bean
    public InsightHandler idleInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::idle,
//                RiskLevel.HIGH,
                InsightType.IDLE.getTitle(),
                InsightType.IDLE.getDescription(),
                InsightType.IDLE.getRecommendation(),
                PayloadType.IDLE,
                InsightType.IDLE.getScore()
        );
    }

    @Bean
    public InsightHandler chargingInsightHandler(RealtimeRule realtimeRule) {
        return new InsightHandler(
                realtimeRule::charging,
//                RiskLevel.HIGH,
                InsightType.CHARGING.getTitle(),
                InsightType.CHARGING.getDescription(),
                InsightType.CHARGING.getRecommendation(),
                PayloadType.CHARGING,
                InsightType.CHARGING.getScore()
        );
    }

    @Bean
    public InsightHandler speedTrendInsightHandler(StatefulRule statefulRule) {
        return new InsightHandler(
                statefulRule::isTrendingUp,
//                RiskLevel.HIGH,
                InsightType.SPEED_RISING.getTitle(),
                InsightType.SPEED_RISING.getDescription(),
                InsightType.SPEED_RISING.getRecommendation(),
                PayloadType.CHARGING,
                InsightType.SPEED_RISING.getScore()
        );
    }

    @Bean
    public InsightHandler cpuWindowInsightHandler(StatefulRule statefulRule) {
        return new InsightHandler(
                cxt -> statefulRule.isHighOverTime(cxt, "cpu"),
//                RiskLevel.HIGH,
                InsightType.CPU_RISING.getTitle(),
                InsightType.CPU_RISING.getDescription(),
                InsightType.CPU_RISING.getRecommendation(),
                PayloadType.CHARGING,
                InsightType.CPU_RISING.getScore()
        );
    }

    @Bean
    public InsightHandler tempWindowInsightHandler(StatefulRule statefulRule) {
        return new InsightHandler(
                cxt -> statefulRule.isHighOverTime(cxt, "temp"),
//                RiskLevel.HIGH,
                InsightType.TEMP_RISING.getTitle(),
                InsightType.TEMP_RISING.getDescription(),
                InsightType.TEMP_RISING.getRecommendation(),
                PayloadType.CHARGING,
                InsightType.TEMP_RISING.getScore()
        );
    }
}
