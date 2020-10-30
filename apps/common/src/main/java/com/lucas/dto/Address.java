package com.lucas.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public class Address {
    private final String street;
    private final Integer number;

    public Address(@JsonProperty("street") String street,
                   @JsonProperty("number") Integer number) {
        this.street = street;
        this.number = number;
    }

    public String getStreet() {
        return street;
    }

    public Integer getNumber() {
        return number;
    }
}
