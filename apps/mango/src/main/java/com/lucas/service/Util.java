package com.lucas.service;

import com.lucas.grpc.Address;
import com.lucas.grpc.People;
import com.lucas.grpc.Person;

import java.util.ArrayList;
import java.util.List;

public class Util {
    public static final People peopleProto;
    public static final com.lucas.dto.People peopleJson;

    static {
        final List<Person> personProtoList = new ArrayList<>();
        final List<com.lucas.dto.Person> personJsonList = new ArrayList<>();

        for (int i = 0; i < 10000; i++) {
            final Address address1 = Address.newBuilder()
                                            .setStreet("Street Number " + i)
                                            .setNumber(i)
                                            .build();

            final com.lucas.dto.Address address1Json = new com.lucas.dto.Address(address1.getStreet(),
                                                                                 address1.getNumber());

            final Address address2 = Address.newBuilder()
                                            .setStreet("Street Number " + i)
                                            .setNumber(i)
                                            .build();

            final com.lucas.dto.Address address2Json = new com.lucas.dto.Address(address2.getStreet(),
                                                                                 address2.getNumber());

            final Person person = Person.newBuilder()
                                        .setName("Person Number " + i)
                                        .addMobile("111111" + i)
                                        .addMobile("222222" + i)
                                        .addEmail("emailperson" + i + "@somewhere.com")
                                        .addEmail("otheremailperson" + i + "@somewhere.com")
                                        .addAddress(address1)
                                        .addAddress(address2)
                                        .build();

            final com.lucas.dto.Person personJson = new com.lucas.dto.Person(person.getName(),
                                                                             List.of(address1Json, address2Json),
                                                                             List.copyOf(person.getMobileList()),
                                                                             List.copyOf(person.getEmailList()));

            personProtoList.add(person);
            personJsonList.add(personJson);
        }

        peopleProto = People.newBuilder()
                            .addAllPerson(personProtoList)
                            .build();

        peopleJson = new com.lucas.dto.People(personJsonList);
    }

}
