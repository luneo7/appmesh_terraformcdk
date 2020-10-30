package com.lucas.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

import java.util.List;

@RegisterForReflection
public class People {
    private final List<Person> person;

    public People(@JsonProperty("person") List<Person> person) {
        this.person = person;
    }

    public List<Person> getPerson() {
        return person;
    }
}
