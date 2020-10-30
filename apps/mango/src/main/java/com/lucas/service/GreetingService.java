package com.lucas.service;

import io.smallrye.mutiny.Uni;

import javax.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class GreetingService {
    public Uni<String> greeting(String name) {
        return Uni.createFrom()
                  .item(name)
                  .onItem()
                  .transform(n -> String.format("hello from mango %s", name));
    }
}
