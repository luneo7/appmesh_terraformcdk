package com.lucas.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

import java.util.List;

@RegisterForReflection
public class Person {
    private final String name;
    private final List<Address> address;
    private final List<String> mobile;
    private final List<String> email;

    public Person(@JsonProperty("name") String name,
                  @JsonProperty("address") List<Address> address,
                  @JsonProperty("mobile") List<String> mobile,
                  @JsonProperty("email") List<String> email) {
        this.name = name;
        this.address = address;
        this.mobile = mobile;
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public List<Address> getAddress() {
        return address;
    }

    public List<String> getMobile() {
        return mobile;
    }

    public List<String> getEmail() {
        return email;
    }
}
