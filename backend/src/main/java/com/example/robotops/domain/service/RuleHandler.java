package com.example.robotops.domain.service;

import com.example.robotops.domain.service.event.EventContext;
import java.util.Optional;
import java.util.function.Function;


public abstract class RuleHandler<T> {

    private final Function<EventContext, Boolean> rule;

    protected RuleHandler(Function<EventContext, Boolean> rule) {
        this.rule = rule;
    }

    public Optional<T> evaluate(EventContext ctx) {
        if (!rule.apply(ctx)) {
            return Optional.empty();
        }

        return Optional.of(create(ctx));
    }

    protected abstract T create(EventContext ctx);
}
