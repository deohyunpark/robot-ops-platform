package com.example.robotops.domain.service.event;

import com.example.robotops.domain.deviceStateType.Mission;
import com.example.robotops.global.errorMessage.StringEnum;
import org.springframework.stereotype.Service;

@Service
public class RealtimeRule {

    public boolean offline(EventContext c) {
        return !Boolean.TRUE.equals(c.online());
    }

    public boolean bumper(EventContext c) {
        return Boolean.TRUE.equals(c.bumper());
    }

    public boolean emergencyStop(EventContext c) {
        return Boolean.TRUE.equals(c.estop());
    }

    public boolean obstacle(EventContext c) {
        return Boolean.TRUE.equals(c.obstacle());
    }

    public boolean overheat(EventContext c) {
        return c.temp() != null && c.temp() >= 70;
    }

    public boolean lowBattery(EventContext c) {
        return c.battery() != null && c.battery() < 20;
    }

    public boolean idle(EventContext c) {
        return StringEnum.from(Mission.class, c.mission()) == Mission.IDLE;
    }

    public boolean charging(EventContext c) {
        return StringEnum.from(Mission.class, c.mission()) == Mission.CHARGE;
    }


}
