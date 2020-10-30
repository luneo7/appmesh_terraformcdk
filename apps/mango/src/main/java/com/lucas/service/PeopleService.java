package com.lucas.service;

import com.lucas.dto.People;
import io.smallrye.mutiny.Uni;

import javax.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PeopleService {
    public Uni<People> getPeople() {
        return Uni.createFrom()
                  .item(Util.peopleJson);
    }
}
